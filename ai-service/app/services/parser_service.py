import re
from typing import Dict, Any, List, Optional
from ..models.resume_schema import (
    ContactInfo,
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    SkillsData,
    ResumeSections,
    ResumeParseResponse
)
from ..parsers.pdf_parser import parse_pdf_document, PDFParsingError
from ..parsers.docx_parser import parse_docx_document, DOCXParsingError
from ..utils.text_cleaning import (
    clean_text,
    extract_emails,
    extract_phones,
    extract_urls,
    extract_social_links,
    categorize_skills,
    find_section_boundaries
)

class UnsupportedDocumentError(Exception):
    def __init__(self, message: str, code: str = "UNSUPPORTED_DOCUMENT"):
        super().__init__(message)
        self.message = message
        self.code = code

def detect_file_type(filename: str, file_bytes: bytes) -> str:
    """Detect file type via extension or magic bytes."""
    fn_lower = filename.lower() if filename else ""
    if fn_lower.endswith(".pdf") or file_bytes.startswith(b"%PDF-"):
        return "pdf"
    if fn_lower.endswith(".docx") or file_bytes.startswith(b"PK\x03\x04"):
        return "docx"
    raise UnsupportedDocumentError(
        f"Unsupported file format '{filename}'. Only PDF and DOCX files are supported.",
        "UNSUPPORTED_DOCUMENT"
    )

def extract_name(header_text: str, email: Optional[str]) -> Optional[str]:
    """Extract candidate name from top lines of the resume header."""
    lines = [l.strip() for l in header_text.split("\n") if l.strip()]
    if not lines:
        return None
    for line in lines[:3]:
        # Filter out lines that look like emails, URLs, phones, or section titles
        if "@" in line or "http" in line or re.search(r"\d{5,}", line):
            continue
        if len(line) < 3 or len(line) > 50:
            continue
        # Check if words look like a person's name (letters and spaces, dashes)
        clean = re.sub(r"[|•,-]", " ", line).strip()
        words = clean.split()
        if 1 <= len(words) <= 4 and all(re.match(r"^[A-Za-z.']+$", w) for w in words):
            return " ".join(words)
    return lines[0][:40] if lines else None

def parse_education(sec_text: str) -> List[EducationEntry]:
    """Parse education entries from education section text."""
    if not sec_text:
        return []
    entries = []
    blocks = [b.strip() for b in re.split(r"\n\s*\n", sec_text) if b.strip()]
    
    degree_keywords = [
        "b.tech", "btech", "b.e", "bachelor", "m.tech", "mtech", "master",
        "m.s", "b.sc", "m.sc", "bca", "mca", "secondary", "senior secondary",
        "class xii", "class x", "high school", "cbse", "icse"
    ]
    
    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue
            
        institution = lines[0]
        degree = None
        field = None
        grad_year = None
        score = None

        full_block = " ".join(lines)
        
        # Look for graduation year (e.g. 2020 - 2024 or 2024)
        year_match = re.search(r"\b(20\d\d(?:\s*[-–]\s*(?:20\d\d|present))?)\b", full_block, re.IGNORECASE)
        if year_match:
            grad_year = year_match.group(1)

        # Look for GPA/Percentage (e.g. 8.7/10 or 8.7 CGPA or 85% or 3.8/4.0)
        score_match = re.search(
            r"((?:cgpa|gpa|percentage|score)?\s*[:\-]?\s*(?:\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*(?:10|4|100))?|\d{2}(?:\.\d)?%))",
            full_block,
            re.IGNORECASE
        )
        if score_match:
            score = score_match.group(1).strip()

        # Identify degree
        for l in lines:
            l_lower = l.lower()
            for kw in degree_keywords:
                if kw in l_lower:
                    degree = l
                    break
            if degree:
                break

        # Field of study
        field_match = re.search(r"(?:computer science|information technology|electronics|mechanical|electrical|data science|artificial intelligence|cse|it|ece)\b", full_block, re.IGNORECASE)
        if field_match:
            field = field_match.group(0).title()

        entries.append(EducationEntry(
            institution=institution,
            degree=degree,
            field=field,
            graduationYear=grad_year,
            score=score
        ))

    return entries

def parse_projects(sec_text: str) -> List[ProjectEntry]:
    """Parse individual projects, tech stacks, links, and impact metrics."""
    if not sec_text:
        return []
    
    entries = []
    # Split projects by empty line or bullet patterns
    blocks = [b.strip() for b in re.split(r"\n(?=[A-Z0-9][A-Za-z0-9\s\-_]{3,40}(?:\s*\||\s*\(|\s*[-–:]))", sec_text) if b.strip()]
    if len(blocks) <= 1:
        blocks = [b.strip() for b in re.split(r"\n\s*\n", sec_text) if b.strip()]

    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        header_line = lines[0]
        # Extract name: often before a delimiter like '|', '-', ':', '('
        name_part = re.split(r"[|\-–:(]", header_line)[0].strip()
        name = name_part if name_part else header_line[:30]

        # Extract tech stack mentions in header or block
        tech_stack = []
        stack_match = re.search(r"(?:tech stack|technologies|built with|tools)?\s*[:|]\s*([a-zA-Z0-9,\s\.\+#\/\-]+)", block, re.IGNORECASE)
        if stack_match:
            raw_tools = stack_match.group(1).split(",")
            tech_stack = [t.strip() for t in raw_tools if t.strip() and len(t.strip()) < 25]
        else:
            # Fallback to scanning for known frameworks
            cat = categorize_skills(block)
            tech_stack = cat["allSkills"][:8]

        # Extract project links (github, live demo)
        gh_link = None
        live_link = None
        urls = extract_urls(block)
        for u in urls:
            if "github.com" in u.lower():
                gh_link = u if u.startswith("http") else f"https://{u}"
            else:
                live_link = u if u.startswith("http") else f"https://{u}"

        # Extract measurable impact (e.g. 50%, 1000 users, 200ms)
        impact_match = re.search(r"(\b\d+[\s]*(?:%|users|ms|x|k|queries|req/s|\+)[^\.\n]*)", block, re.IGNORECASE)
        impact = impact_match.group(1).strip() if impact_match else None

        # Collect bullet points / highlights
        highlights = [l.lstrip("-•* ").strip() for l in lines[1:] if l.strip() and not l.lower().startswith("tech stack")]
        description = " ".join(highlights[:2]) if highlights else (lines[1] if len(lines) > 1 else None)

        entries.append(ProjectEntry(
            name=name,
            description=description,
            techStack=tech_stack,
            githubLink=gh_link,
            liveLink=live_link,
            impact=impact,
            highlights=highlights
        ))

    return entries

def parse_experience(sec_text: str) -> List[ExperienceEntry]:
    """Parse work and internship experiences."""
    if not sec_text:
        return []
    
    entries = []
    blocks = [b.strip() for b in re.split(r"\n\s*\n", sec_text) if b.strip()]
    if not blocks:
        blocks = [sec_text]

    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue
            
        company = lines[0]
        role = lines[1] if len(lines) > 1 and len(lines[1]) < 50 else None
        
        # Look for duration
        duration_match = re.search(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-9]{4})\s*[-–]\s*(?:present|[0-9]{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*[0-9]{4}))", block, re.IGNORECASE)
        duration = duration_match.group(1) if duration_match else None

        responsibilities = [l.lstrip("-•* ").strip() for l in lines if (l.startswith("-") or l.startswith("•") or l.startswith("*"))]
        if not responsibilities and len(lines) > 2:
            responsibilities = lines[2:]

        entries.append(ExperienceEntry(
            company=company,
            role=role,
            duration=duration,
            responsibilities=responsibilities
        ))

    return entries

def parse_achievements(sec_text: str) -> List[str]:
    """Parse list of achievements, hackathons, awards, and certifications."""
    if not sec_text:
        return []
    items = []
    for line in sec_text.split("\n"):
        clean_l = line.lstrip("-•* ").strip()
        if clean_l and len(clean_l) > 5:
            items.append(clean_l)
    return items

def parse_resume_content(file_bytes: bytes, filename: str) -> ResumeParseResponse:
    """
    Main orchestration entrypoint to parse PDF or DOCX file into structured resume schema.
    """
    file_type = detect_file_type(filename, file_bytes)

    if file_type == "pdf":
        parsed_doc = parse_pdf_document(file_bytes)
    elif file_type == "docx":
        parsed_doc = parse_docx_document(file_bytes)
    else:
        raise UnsupportedDocumentError(f"Unsupported file type '{file_type}'.", "UNSUPPORTED_DOCUMENT")

    raw_text = parsed_doc["rawText"]
    page_count = parsed_doc["pageCount"]
    layout_analysis = parsed_doc["layout"]

    cleaned_text = clean_text(raw_text)
    sections_map = find_section_boundaries(cleaned_text)

    # 1. Contact Information
    header_text = sections_map.get("header", "")
    emails = extract_emails(cleaned_text)
    phones = extract_phones(cleaned_text)
    urls = extract_urls(cleaned_text)
    socials = extract_social_links(cleaned_text, urls)
    
    primary_email = emails[0] if emails else None
    primary_phone = phones[0] if phones else None
    name = extract_name(header_text, primary_email)

    contact = ContactInfo(
        name=name,
        email=primary_email,
        phone=primary_phone,
        github=socials.get("github"),
        linkedin=socials.get("linkedin"),
        leetcode=socials.get("leetcode"),
        portfolio=socials.get("portfolio")
    )

    # 2. Education
    edu_entries = parse_education(sections_map.get("education", ""))

    # 3. Experience
    exp_entries = parse_experience(sections_map.get("experience", ""))

    # 4. Projects
    proj_entries = parse_projects(sections_map.get("projects", ""))

    # 5. Skills
    skills_sec_text = sections_map.get("skills", "")
    categorized_skills_dict = categorize_skills(f"{skills_sec_text}\n{cleaned_text}")
    skills_data = SkillsData(
        languages=categorized_skills_dict["languages"],
        frameworks=categorized_skills_dict["frameworks"],
        databases=categorized_skills_dict["databases"],
        cloud=categorized_skills_dict["cloud"],
        tools=categorized_skills_dict["tools"],
        other=categorized_skills_dict["other"],
        allSkills=categorized_skills_dict["allSkills"]
    )

    # 6. Achievements
    achievements_list = parse_achievements(sections_map.get("achievements", ""))

    # 7. Summary
    summary_text = sections_map.get("summary") or None

    sections = ResumeSections(
        contact=contact,
        summary=summary_text,
        education=edu_entries,
        experience=exp_entries,
        projects=proj_entries,
        skills=skills_data,
        achievements=achievements_list,
        links=urls
    )

    return ResumeParseResponse(
        success=True,
        pageCount=page_count,
        fileType=file_type,
        text=raw_text,
        cleanText=cleaned_text,
        sections=sections,
        layout=layout_analysis
    )
