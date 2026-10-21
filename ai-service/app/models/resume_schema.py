from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ContactInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    leetcode: Optional[str] = None
    portfolio: Optional[str] = None

class EducationEntry(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    graduationYear: Optional[str] = None
    score: Optional[str] = None

class ExperienceEntry(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)

class ProjectEntry(BaseModel):
    name: str
    description: Optional[str] = None
    techStack: List[str] = Field(default_factory=list)
    githubLink: Optional[str] = None
    liveLink: Optional[str] = None
    impact: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)

class SkillsData(BaseModel):
    languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    databases: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    cloud: List[str] = Field(default_factory=list)
    other: List[str] = Field(default_factory=list)
    allSkills: List[str] = Field(default_factory=list)

class VisualLayoutAnalysis(BaseModel):
    isScanned: bool = False
    confidence: float = 1.0
    layoutAnomalies: List[str] = Field(default_factory=list)
    lineCount: int = 0
    wordCount: int = 0
    characterCount: int = 0
    estimatedSectionSpacing: Optional[str] = "normal"

class ResumeSections(BaseModel):
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    education: List[EducationEntry] = Field(default_factory=list)
    experience: List[ExperienceEntry] = Field(default_factory=list)
    projects: List[ProjectEntry] = Field(default_factory=list)
    skills: SkillsData = Field(default_factory=SkillsData)
    achievements: List[str] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list)

class ResumeParseResponse(BaseModel):
    success: bool = True
    pageCount: int
    fileType: str
    text: str
    cleanText: str
    sections: ResumeSections
    layout: VisualLayoutAnalysis

class ParseErrorResponse(BaseModel):
    success: bool = False
    errorCode: str
    message: str
    details: Optional[Dict[str, Any]] = None
