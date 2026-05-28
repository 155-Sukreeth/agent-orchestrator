import re
from bs4 import BeautifulSoup
from typing import List

class ChunkingService:
    
    def chunk_content(self, content: str, content_type: str, max_chars: int = 1000, overlap: int = 200) -> List[str]:
        if content_type == "html" or content_type == "web_crawler":
            return self._chunk_html(content)
        elif content_type == "markdown" or content_type == "notion":
            return self._chunk_markdown(content)
        else:
            return self._chunk_sliding_window(content, max_chars, overlap)

    def _chunk_html(self, html: str) -> List[str]:
        soup = BeautifulSoup(html, "html.parser")
        chunks = []
        current_chunk = ""
        current_header = ""
        
        for element in soup.body.descendants if soup.body else soup.descendants:
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                if current_chunk:
                    chunks.append(f"{current_header}\n{current_chunk}".strip())
                current_header = element.get_text(strip=True)
                current_chunk = ""
            elif element.name in ['p', 'li', 'div', 'span']:
                text = element.get_text(strip=True)
                if text and text not in current_chunk:
                    current_chunk += f"{text}\n"
                    
        if current_chunk:
            chunks.append(f"{current_header}\n{current_chunk}".strip())
            
        return [c for c in chunks if c.strip()]

    def _chunk_markdown(self, markdown: str) -> List[str]:
        # Split by markdown headers
        sections = re.split(r'(^#+\s+.*$)', markdown, flags=re.MULTILINE)
        chunks = []
        current_chunk = ""
        
        for part in sections:
            if re.match(r'^#+\s+', part):
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = part + "\n"
            else:
                current_chunk += part
                
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
            
        return chunks

    def _chunk_sliding_window(self, text: str, max_chars: int, overlap: int) -> List[str]:
        # Split by double newline first, then fallback to character window
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            if len(current_chunk) + len(p) < max_chars:
                current_chunk += p + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # If a single paragraph is larger than max_chars, split it by window
                if len(p) > max_chars:
                    for i in range(0, len(p), max_chars - overlap):
                        chunks.append(p[i:i+max_chars])
                    current_chunk = ""
                else:
                    current_chunk = p + "\n\n"
                    
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
            
        return chunks

chunking_service = ChunkingService()
