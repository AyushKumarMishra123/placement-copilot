import re
import unicodedata
from typing import Dict, List, Tuple, Any

KNOWN_SKILLS_TAXONOMY = {
    "languages": [
        "python", "javascript", "typescript", "c++", "c", "java", "c#", "go", "golang",
        "rust", "ruby", "php", "swift", "kotlin", "sql", "html", "html5", "css", "css3",
        "r", "matlab", "scala", "dart", "shell", "bash"
    ],
    "frameworks": [
        "react", "react.js", "reactjs", "next.js", "nextjs", "vue", "vue.js", "angular",
        "node.js", "nodejs", "express", "express.js", "django", "flask", "fastapi",
        "spring boot", "spring", "asp.net", "dotnet", ".net", "laravel", "ruby on rails",
        "tailwind", "tailwindcss", "bootstrap", "redux", "redux toolkit", "graphql", "rest api"
    ],
    "databases": [
        "mongodb", "postgresql", "postgres", "mysql", "redis", "sqlite", "oracle",
        "cassandra", "dynamodb", "neo4j", "mariadb", "firebase", "firestore", "supabase"
    ],
    "cloud": [
        "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
        "docker", "kubernetes", "k8s", "terraform", "vercel", "netlify", "heroku", "render"
    ],
    "tools": [
        "git", "github", "gitlab", "bitbucket", "postman", "linux", "ubuntu", "jira",
        "vite", "webpack", "jest", "pytest", "cypress", "selenium", "figma", "ci/cd", "github actions"
    ]
}

def clean_text(text: str) -> str:
    """Normalize unicode characters and whitespace while preserving paragraph structure."""
    if not text:
        return ""
    # Normalize unicode
    normalized = unicodedata.normalize("NFKD", text)
    # Replace non-standard whitespace / null bytes
    normalized = normalized.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    # Replace weird bullet characters with standard dash
    normalized = re.sub(r"[\u2022\u2023\u25E6\u2043\u2219\u00B7]", "\n- ", normalized)
    # Collapse 3+ consecutive newlines
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    # Strip trailing whitespace on each line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in normalized.split("\n")]
    return "\n".join(lines).strip()

def extract_emails(text: str) -> List[str]:
    """Find valid email addresses in text."""
    pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    matches = re.findall(pattern, text)
    # Filter out common extensions or trailing dots
    cleaned = []
    for m in matches:
        email = m.rstrip(".,;")
        if email not in cleaned:
            cleaned.append(email)
    return cleaned

def extract_phones(text: str) -> List[str]:
    """Extract standard mobile and international phone numbers."""
    pattern = r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}"
    matches = re.findall(pattern, text)
    valid_phones = []
    for m in matches:
        cleaned = re.sub(r"[^\d+]", "", m)
        if 10 <= len(cleaned.replace("+", "")) <= 13:
            if m.strip() not in valid_phones:
                valid_phones.append(m.strip())
    return valid_phones

def extract_urls(text: str) -> List[str]:
    """Extract full or short web URLs."""
    pattern = r"(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)"
    candidates = re.findall(pattern, text)
    valid_urls = []
    for c in candidates:
        if "@" in c:  # skip emails mistakenly captured
            continue
        cleaned = c.rstrip(".,;)")
        if "." in cleaned and len(cleaned) > 4:
            valid_urls.append(cleaned)
    return list(dict.fromkeys(valid_urls))

def extract_social_links(text: str, urls: List[str]) -> Dict[str, str]:
    """Identify GitHub, LinkedIn, LeetCode, and Portfolio links."""
    socials: Dict[str, str] = {
        "github": None,
        "linkedin": None,
        "leetcode": None,
        "portfolio": None
    }
    
    all_targets = urls + [line for line in text.split("\n") if any(kw in line.lower() for kw in ["github", "linkedin", "leetcode"])]

    for target in all_targets:
        target_lower = target.lower()
        if not socials["github"]:
            gh_match = re.search(r"(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)", target, re.IGNORECASE)
            if gh_match:
                socials["github"] = f"https://github.com/{gh_match.group(1)}"
            elif "github:" in target_lower or "github -" in target_lower:
                parts = re.split(r"github\s*[:\-]\s*", target, flags=re.IGNORECASE)
                if len(parts) > 1:
                    handle = parts[1].strip().split()[0].replace("@", "")
                    socials["github"] = f"https://github.com/{handle}"

        if not socials["linkedin"]:
            li_match = re.search(r"(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)", target, re.IGNORECASE)
            if li_match:
                socials["linkedin"] = f"https://linkedin.com/in/{li_match.group(1)}"

        if not socials["leetcode"]:
            lc_match = re.search(r"(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)", target, re.IGNORECASE)
            if lc_match:
                socials["leetcode"] = f"https://leetcode.com/{lc_match.group(1)}"

        if not socials["portfolio"]:
            # Custom portfolio domain or vercel/netlify app or personal site
            if any(term in target_lower for term in [".dev", ".me", "portfolio", ".vercel.app", ".netlify.app", ".github.io"]):
                if not any(k in target_lower for k in ["github.com", "linkedin.com", "leetcode.com"]):
                    url_clean = target.strip()
                    if not url_clean.startswith("http"):
                        url_clean = f"https://{url_clean}"
                    socials["portfolio"] = url_clean

    return socials

SECTION_PATTERNS = {
    "summary": [
        r"^(?:professional\s+)?summary\b",
        r"^objective\b",
        r"^career\s+objective\b",
        r"^about\s+me\b",
        r"^profile\b"
    ],
    "education": [
        r"^education\b",
        r"^academic\s+background\b",
        r"^educational\s+qualifications?\b",
        r"^academics\b"
    ],
    "experience": [
        r"^(?:work\s+)?experience\b",
        r"^professional\s+experience\b",
        r"^employment\s+history\b",
        r"^internships?\b"
    ],
    "projects": [
        r"^(?:technical\s+)?projects?\b",
        r"^academic\s+projects?\b",
        r"^personal\s+projects?\b",
        r"^featured\s+projects?\b",
        r"^key\s+projects?\b"
    ],
    "skills": [
        r"^technical\s+skills?\b",
        r"^skills?\s*(?:&|and)\s*abilities\b",
        r"^skills?\b",
        r"^core\s+competencies\b",
        r"^technologies\b"
    ],
    "achievements": [
        r"^achievements?\b",
        r"^awards?\s*(?:&|and)\s*honors?\b",
        r"^certifications?\b",
        r"^co[- ]curricular\s+activities\b",
        r"^extracurricular\s+activities\b",
        r"^accomplishments?\b",
        r"^leadership\b"
    ]
}

def find_section_boundaries(text: str) -> Dict[str, str]:
    """Segment resume text into logical sections based on detected headers."""
    lines = text.split("\n")
    sections_content: Dict[str, List[str]] = {
        "header": [],
        "summary": [],
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
        "achievements": []
    }
    
    current_section = "header"
    
    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            if current_section != "header":
                sections_content[current_section].append("")
            continue

        # Check if line looks like a header (short length, uppercase or prominent title)
        is_header = False
        lower_line = trimmed.lower()
        if len(trimmed) < 40 and not trimmed.endswith("."):
            for sec_name, patterns in SECTION_PATTERNS.items():
                if any(re.search(pat, lower_line) for pat in patterns):
                    current_section = sec_name
                    is_header = True
                    break

        if not is_header:
            sections_content[current_section].append(trimmed)

    # Convert list of lines to joined text
    return {k: "\n".join(v).strip() for k, v in sections_content.items()}

def categorize_skills(raw_text: str, detected_skills: List[str] = None) -> Dict[str, List[str]]:
    """Classify detected and text skills into technical buckets."""
    categorized: Dict[str, List[str]] = {
        "languages": [],
        "frameworks": [],
        "databases": [],
        "cloud": [],
        "tools": [],
        "other": [],
        "allSkills": []
    }
    
    lower_text = f" {raw_text.lower()} "
    # Replace punctuation with spaces for word matching
    token_text = re.sub(r"[,/|;•()]", " ", lower_text)
    
    all_seen = set()
    
    for category, skill_list in KNOWN_SKILLS_TAXONOMY.items():
        for skill in skill_list:
            # Word boundary regex
            pattern = r"(?:^|\s)" + re.escape(skill) + r"(?:\s|$)"
            if re.search(pattern, token_text):
                # Clean title display
                display_name = skill.title()
                if skill.lower() in ["sql", "html", "css", "aws", "gcp", "ci/cd", "k8s", "c++", "c#"]:
                    display_name = skill.upper()
                if skill.lower() == "mongodb":
                    display_name = "MongoDB"
                if skill.lower() in ["react", "react.js", "reactjs"]:
                    display_name = "React"
                if skill.lower() in ["node.js", "nodejs"]:
                    display_name = "Node.js"
                if skill.lower() in ["next.js", "nextjs"]:
                    display_name = "Next.js"
                if skill.lower() in ["express", "express.js"]:
                    display_name = "Express.js"
                    
                if display_name not in categorized[category]:
                    categorized[category].append(display_name)
                    all_seen.add(display_name)

    if detected_skills:
        for s in detected_skills:
            clean_s = s.strip()
            if clean_s and clean_s not in all_seen:
                categorized["other"].append(clean_s)
                all_seen.add(clean_s)

    categorized["allSkills"] = list(all_seen)
    return categorized
