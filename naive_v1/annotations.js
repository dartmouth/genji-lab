// Handle text selection
function handleTextSelection(e) {
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Only process if there's actually text selected
    if (selection.toString().trim().length === 0) return;
    
    // Get all paragraphs in the selection
    const startParagraph = range.startContainer.parentElement.closest('.annotatable-paragraph');
    const endParagraph = range.endContainer.parentElement.closest('.annotatable-paragraph');
    
    if (!startParagraph || !endParagraph) return;
    
    // Get all paragraphs between start and end
    const paragraphs = [];
    let currentElement = startParagraph;
    
    while (currentElement) {
        if (currentElement.classList.contains('annotatable-paragraph')) {
            paragraphs.push(currentElement.id);
        }
        
        if (currentElement === endParagraph) break;
        currentElement = currentElement.nextElementSibling;
    }
    
    const selectionInfo = {
        paragraphIds: paragraphs,
        start: range.startOffset,
        end: range.endOffset,
        selectedText: selection.toString()
    };
    
    console.log('Selection Info:', selectionInfo);
}

// Create a comment card for an annotation
function createCommentCard(annotation) {
    const commentCard = document.createElement('div');
    commentCard.className = 'comment-card';
    commentCard.id = `comment-${annotation.id}`;
    
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';
    commentHeader.textContent = annotation.creator.split('/').pop();
    
    const commentBody = document.createElement('div');
    commentBody.className = 'comment-body';
    commentBody.textContent = annotation.body.value;
    
    commentCard.appendChild(commentHeader);
    commentCard.appendChild(commentBody);
    
    document.getElementById('comments-container').appendChild(commentCard);
    
    return commentCard;
}

// Update a highlight for an annotation
function updateHighlight(annotation, targetElement, commentCard) {
    const existingContainer = targetElement.querySelector(`.highlight-container-${annotation.id}`);
    if (existingContainer) {
        existingContainer.remove();
    }
    
    const { start, end } = annotation.target[0].selector.refinedBy;
    const range = document.createRange();
    const textNode = targetElement.firstChild;
    
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rects = range.getClientRects();
    
    const highlightContainer = document.createElement('div');
    highlightContainer.className = `highlight-container-${annotation.id}`;
    highlightContainer.style.position = 'absolute';
    highlightContainer.style.pointerEvents = 'none';
    highlightContainer.style.zIndex = '1';
    highlightContainer.style.top = '0';
    highlightContainer.style.left = '0';
    
    Array.from(rects).forEach(rect => {
        const highlight = document.createElement('div');
        highlight.style.position = 'absolute';
        highlight.style.backgroundColor = 'yellow';
        highlight.style.opacity = '0.5';
        highlight.style.left = `${rect.left - targetElement.getBoundingClientRect().left}px`;
        highlight.style.top = `${rect.top - targetElement.getBoundingClientRect().top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        highlight.style.pointerEvents = 'none';
        highlight.style.userSelect = 'none';
        
        highlightContainer.appendChild(highlight);
    });
    
    // Add event listeners to the container
    highlightContainer.addEventListener('mouseenter', () => {
        commentCard.classList.add('highlighted');
    });
    
    highlightContainer.addEventListener('mouseleave', () => {
        commentCard.classList.remove('highlighted');
    });
    
    targetElement.appendChild(highlightContainer);
}

// Create a highlight for an annotation
function createHighlight(annotation) {
    const targetId = annotation.target[0].selector.value;
    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
        console.error(`Target element ${targetId} not found`);
        return null;
    }
    
    // Create comment card
    const commentCard = createCommentCard(annotation);
    
    // Create the highlight
    updateHighlight(annotation, targetElement, commentCard);
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
        updateHighlight(annotation, targetElement, commentCard);
    });
    
    resizeObserver.observe(targetElement);
    
    return {
        update: () => updateHighlight(annotation, targetElement, commentCard),
        cleanup: () => {
            resizeObserver.disconnect();
            const container = targetElement.querySelector(`.highlight-container-${annotation.id}`);
            if (container) container.remove();
            commentCard.remove();
        }
    };
}

// Create the highlight system
function createHighlightSystem(annotations) {
    const highlights = new Map();
    
    function initialize() {
        // Clean up any existing highlights
        highlights.forEach(highlight => highlight.cleanup());
        highlights.clear();
        
        // Create new highlights
        annotations.forEach(annotation => {
            const highlight = createHighlight(annotation);
            if (highlight) {
                highlights.set(annotation.id, highlight);
            }
        });
    }
    
    function cleanup() {
        highlights.forEach(highlight => highlight.cleanup());
        highlights.clear();
    }
    
    // Handle window resize for all highlights
    window.addEventListener('resize', () => {
        highlights.forEach(highlight => highlight.update());
    });
    
    return {
        initialize,
        cleanup
    };
}

// Fetch annotations from the API
async function fetchAnnotations() {
    try {
        const response = await fetch('http://localhost:5000/annotations');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const annotations = await response.json();
        return annotations;
    } catch (error) {
        console.error('Error fetching annotations:', error);
        // Return an empty array if there's an error
        return [];
    }
}

// Initialize the application
async function initializeApp() {
    // Show loading state if needed
    document.getElementById('comments-container').innerHTML = '<div class="loading">Loading annotations...</div>';
    
    try {
        // Fetch annotations from the API
        const annotations = await fetchAnnotations();
        
        // Clear loading state
        document.getElementById('comments-container').innerHTML = '';
        
        // Initialize the highlight system with the fetched annotations
        const highlightSystem = createHighlightSystem(annotations);
        highlightSystem.initialize();
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('comments-container').innerHTML = 
            '<div class="error">Error loading annotations. Please try again later.</div>';
    }
}

// Set up event listeners
document.addEventListener('mouseup', handleTextSelection);

// Initialize the app when the page loads
window.addEventListener('load', initializeApp);