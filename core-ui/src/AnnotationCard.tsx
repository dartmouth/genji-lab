import React from "react";

interface Annotation {
    "@context": string;
    "id": string;
    "type": string;
    "creator": string;
    "created": string;
    "modified": string;
    "generator": string;
    "generated": string;
    "motivation": string;
    "body": {
        "id": string;
        "type": string;
        "value": string;
        "format": string;
        "language": string;
    };
    "target": Array<{
        "id": string;
        "type": string;
        "source": string;
        "selector": {
            "type": string;
            "value": string;
            "refinedBy": {
                "type": string;
                "start": number;
                "end": number;
            };
        };
    }>
}
interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation }) => {
    // const [start, setStart] = useState(0)
    // const [end, setEnd] = useState(0)
    // function addHighlight() {
    //     const targetId = annotation.target[0].selector.value
    //     const targetElement = document.getElementById(targetId)
    //     if (!targetElement) {
    //         console.error("Target element not found")
    //         return
    //     }
    //     const existingContainer = targetElement.querySelector(`.highlight-container-${annotation.id}`);
        
    //     if (existingContainer) {
    //         existingContainer.remove();
    //     }
    //     const start = annotation.target[0].selector.refinedBy.start
    //     const end = annotation.target[0].selector.refinedBy.end
    //     const range = document.createRange()
    //     const textNode =targetElement.firstChild;
    //     if (!textNode) {
    //         console.error("Text node not found")
    //         return
    //     }
    //     range.setStart(textNode, start)
    //     range.setEnd(textNode, end)
    //     const rects = range.getClientRects();
    
    //     const highlightContainer = document.createElement('div');
    //     highlightContainer.className = `highlight-container-${annotation.id}`;
    //     highlightContainer.style.position = 'absolute';
    //     highlightContainer.style.pointerEvents = 'none';
    //     highlightContainer.style.zIndex = '1';
    //     highlightContainer.style.top = '0';
    //     highlightContainer.style.left = '0';
        
    //     Array.from(rects).forEach(rect => {
    //         const highlight = document.createElement('div');
    //         highlight.style.position = 'absolute';
    //         highlight.style.backgroundColor = 'yellow';
    //         highlight.style.opacity = '0.5';
    //         highlight.style.left = `${rect.left - targetElement.getBoundingClientRect().left}px`;
    //         highlight.style.top = `${rect.top - targetElement.getBoundingClientRect().top}px`;
    //         highlight.style.width = `${rect.width}px`;
    //         highlight.style.height = `${rect.height}px`;
    //         highlight.style.pointerEvents = 'none';
    //         highlight.style.userSelect = 'none';
            
    //         highlightContainer.appendChild(highlight);
    //     });
        
    //     // Add event listeners to the container
    //     highlightContainer.addEventListener('mouseenter', () => {
    //         targetElement.classList.add('highlighted');
    //     });
        
    //     highlightContainer.addEventListener('mouseleave', () => {
    //         targetElement.classList.remove('highlighted');
    //     });
        
    //     targetElement.appendChild(highlightContainer);
    // }

    // useEffect(() => {
    //     addHighlight()
    // }, [])

    return (
        <div key={id} className="comment-card">
            <div className="comment-header">{annotation.creator}</div>
            <div className="comment-body">{annotation.body.value}</div>
        </div>
    )
}

export default AnnotationCard