# Annotations Guide: Deep Dive

**Project:** Genji Document Annotation Platform  
**Audience:** All Users (Students, Instructors, Administrators)

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is Annotation?](#what-is-annotation)
3. [Annotation Types Overview](#annotation-types-overview)
4. [Annotation Type Details](#annotation-type-details)
5. [Creating Annotations](#creating-annotations)
6. [Advanced Annotation Techniques](#advanced-annotation-techniques)
7. [Collaborative Annotation](#collaborative-annotation)
8. [Annotation Best Practices](#annotation-best-practices)
9. [Technical Details](#technical-details)
10. [Examples and Use Cases](#examples-and-use-cases)

---

## Introduction

### About This Guide

This guide provides comprehensive coverage of Genji's annotation features, including all annotation types, how to use them effectively, and best practices for collaborative annotation.

### Who Should Read This

- **Students:** Learn how to create rich, meaningful annotations
- **Instructors:** Understand annotation features to design better assignments
- **Administrators:** Technical overview of annotation system
- **All Users:** Master the annotation tools available in Genji

### What You'll Learn

- The 8 different annotation types (motivations) available
- When and how to use each annotation type
- Creating simple and complex annotations
- Collaborative annotation strategies
- Best practices for effective annotation
- Technical details about how annotations work

---

## What is Annotation?

### Definition

**Annotation** is the practice of adding notes, comments, questions, tags, and other forms of commentary to a text while reading. In digital humanities and educational contexts, annotation serves multiple purposes:

- **Comprehension:** Aid understanding of complex texts
- **Analysis:** Critical examination and interpretation
- **Collaboration:** Shared meaning-making with others
- **Documentation:** Record thoughts and reactions
- **Connection:** Link ideas across texts and contexts

### The Genji Annotation Model

Genji uses the **Web Annotation Data Model** (W3C standard) which defines annotations as:

```
Annotation = Target + Body + Motivation
```

- **Target:** What you're annotating (text selection, document section)
- **Body:** Your annotation content (comment, tag, link)
- **Motivation:** Why you're annotating (commenting, questioning, tagging, etc.)

This model allows for rich, structured annotations that serve different purposes.

---

## Annotation Types Overview

Genji supports **8 core annotation types** (called "motivations" in the W3C model):

| Type | Purpose | Icon | Common Uses |
|------|---------|------|-------------|
| **Commenting** | General observation or remark | 💬 | Sharing thoughts, analysis, reactions |
| **Questioning** | Asking questions | ❓ | Seeking clarification, starting discussion |
| **Replying** | Responding to others | ↩️ | Joining conversations, feedback |
| **Tagging** | Categorizing with keywords | 🏷️ | Identifying themes, organizing content |
| **Linking** | Cross-referencing | 🔗 | Connecting texts, citing sources |
| **Describing** | Explaining or defining | 📝 | Providing context, definitions |
| **Classifying** | Formal categorization | 📋 | Using controlled vocabularies |
| **Identifying** | Naming entities | 🔍 | Recognizing people, places, concepts |

**Note:** Your instructor may emphasize certain types based on learning objectives. Check your assignment requirements!

---

## Annotation Type Details

### 1. Commenting

**Purpose:** Make general observations, share insights, or analyze the text

**When to Use:**
- Sharing your interpretation of a passage
- Noting important points
- Providing analysis or critique
- Recording your reactions

**How to Create:**
1. Select the text passage
2. Choose "Comment" from the annotation menu
3. Write your observation or analysis
4. Submit

**Example:**
> **Selected Text:** "It was the best of times, it was the worst of times..."
> 
> **Comment:** "This opening paradox sets up the novel's central theme of duality - the parallel experiences of luxury and suffering during the French Revolution. Dickens immediately establishes that this is a story about contrasts."

**Best Practices:**
- Be specific about what you're observing
- Explain your reasoning
- Support claims with evidence
- Connect to course concepts
- Go beyond summary - analyze!

---

### 2. Questioning

**Purpose:** Ask questions about confusing sections, invite discussion, or prompt deeper thinking

**When to Use:**
- Something is unclear or confusing
- You want to invite peer discussion
- Prompting critical thinking
- Asking about context or background

**How to Create:**
1. Select the text passage
2. Choose "Question" from the annotation menu
3. Write your question clearly
4. Submit

**Example:**
> **Selected Text:** "All animals are equal, but some animals are more equal than others."
> 
> **Question:** "How can beings be 'more equal' if equality is absolute? Is Orwell highlighting the logical contradiction in totalitarian rhetoric, or is this meant to show how language can be twisted to justify inequality?"

**Best Practices:**
- Ask genuine, thoughtful questions
- Be specific about what you're asking
- Explain why you're confused (helps others help you)
- Ask open-ended questions to encourage discussion
- Follow up when others answer

**Types of Questions:**
- **Clarifying:** "What does the author mean by...?"
- **Contextual:** "What was happening historically when...?"
- **Analytical:** "Why does the character...?"
- **Interpretive:** "Could this symbolize...?"
- **Evaluative:** "How effective is this argument?"

---

### 3. Replying

**Purpose:** Respond to annotations created by classmates or instructors

**When to Use:**
- Answering someone's question
- Building on someone's insight
- Offering a different perspective
- Continuing a discussion
- Providing feedback

**How to Create:**
1. Find the annotation you want to respond to
2. Click "Reply"
3. Write your response
4. Submit

**Example:**
> **Original Question:** "Why does the narrator describe the house as 'alive'?"
> 
> **Reply:** "I think the 'alive' description ties into the Gothic tradition of the house as a character itself. Throughout the novel, the house mirrors the psychological state of its inhabitants - when they're disturbed, the house exhibits strange behavior. It's almost like the building has absorbed the emotions of everyone who's lived there."

**Best Practices:**
- Address the person by name
- Reference their specific point
- Build on their idea or offer alternatives
- Be respectful in disagreements
- Ask follow-up questions
- Continue the conversation

**Reply Etiquette:**
- Read the full thread before replying
- Don't just agree - add something new
- Be constructive in criticism
- Acknowledge good points
- Stay on topic

---

### 4. Tagging

**Purpose:** Label passages with keywords or themes for organization and discovery

**When to Use:**
- Identifying recurring themes
- Categorizing content by topic
- Marking literary devices
- Organizing your thinking
- Enabling search and filtering

**How to Create:**
1. Select the text passage
2. Choose "Tag" from the annotation menu
3. Enter one or more tags (keywords)
4. Optionally add a note explaining the tag
5. Submit

**Example:**
> **Selected Text:** "The fog came creeping in, shrouding the city in grey silence."
> 
> **Tags:** `#imagery` `#setting` `#atmosphere` `#foreshadowing`
> 
> **Note:** "The fog imagery establishes a mysterious, ominous mood that suggests something hidden or dangerous."

**Best Practices:**
- Use consistent tag names throughout
- Be specific but not too narrow
- Include a note explaining why you chose the tag
- Use established tags when possible (check what others use)
- Consider creating a personal tagging system

**Common Tag Categories:**

- **Literary Devices:** `#metaphor` `#symbolism` `#irony` `#foreshadowing`
- **Themes:** `#identity` `#justice` `#power` `#family`
- **Characters:** `#protagonist` `#antagonist` `#dynamic-character`
- **Rhetorical Strategies:** `#ethos` `#pathos` `#logos`
- **Historical Context:** `#victorian-era` `#post-war` `#industrial-revolution`
- **Argument Elements:** `#claim` `#evidence` `#counterargument`

---

### 5. Linking

**Purpose:** Create cross-references between documents or to external sources

**When to Use:**
- Connecting related passages in different texts
- Citing supporting sources
- Showing intertextual relationships
- Building networks of ideas
- Referencing external resources

**How to Create:**
1. Select the text passage
2. Choose "Link" from the annotation menu
3. Enter the target URL or select another document/passage
4. Add a description of the connection
5. Submit

**Example:**
> **Selected Text:** "I think, therefore I am."
> 
> **Link to:** [Another document in the collection: "Meditations on First Philosophy"]
> 
> **Description:** "This famous line appears in Discourse on Method (1637) but is explored in much greater depth in the Meditations (1641). In the Meditations, Descartes builds his entire philosophical system on this foundational certainty. See Part II of the Meditations for the full argument."

**Types of Links:**

1. **Intertextual Links:** Connect passages in different course documents
   - Similar themes or arguments
   - Contrasting viewpoints
   - Historical references
   - Shared allusions

2. **Cross-Reference Links:** Connect passages within the same document
   - Call-backs to earlier points
   - Development of themes
   - Recurring motifs

3. **External Links:** Connect to outside sources
   - Historical context
   - Author biography
   - Critical essays
   - Related media

**Best Practices:**
- Always explain the connection - don't just link
- Make sure linked content is relevant
- Use appropriate links (check with instructor about external sources)
- Create bidirectional understanding (explain how A relates to B)
- Build networks of related ideas

---

### 6. Describing

**Purpose:** Provide explanation, context, or definition of terms and concepts

**When to Use:**
- Defining unfamiliar terms
- Explaining historical context
- Clarifying references
- Providing background information
- Glossing difficult passages

**How to Create:**
1. Select the text passage (often a specific term or phrase)
2. Choose "Describe" from the annotation menu
3. Write your explanation or definition
4. Include sources if relevant
5. Submit

**Example:**
> **Selected Text:** "The Treaty of Versailles"
> 
> **Description:** "The Treaty of Versailles (1919) was the peace treaty that officially ended World War I. Signed at the Palace of Versailles in France, it imposed harsh penalties on Germany, including significant territorial losses, military restrictions, and massive reparations payments. Many historians argue that the treaty's punitive terms contributed to economic hardship in Germany and the rise of fascism, ultimately leading to World War II. In this text, the author references it as a cautionary tale about the consequences of punitive peace agreements."

**What to Include:**
- Clear, concise definition or explanation
- Relevant context (historical, cultural, etc.)
- Why this matters for understanding the text
- Sources for factual information
- Connection to the broader reading

**Best Practices:**
- Write for your audience (classmates at your level)
- Be accurate - check your facts
- Cite sources for factual claims
- Explain significance, not just definition
- Keep it concise but comprehensive

---

### 7. Classifying

**Purpose:** Formally categorize content using established systems or taxonomies

**When to Use:**
- Using controlled vocabularies or taxonomies
- Formal academic categorization
- Discipline-specific classification schemes
- Structured analysis projects
- Research and archival purposes

**How to Create:**
1. Select the text passage
2. Choose "Classify" from the annotation menu
3. Select or enter the classification term(s)
4. Add notes explaining your classification
5. Submit

**Example:**
> **Selected Text:** "We hold these truths to be self-evident, that all men are created equal..."
> 
> **Classification:** 
> - **Document Type:** Primary Source - Political
> - **Genre:** Foundational Legal Document
> - **Rhetorical Mode:** Declaration / Assertion
> - **Historical Period:** Enlightenment (1776)
> 
> **Note:** "This passage from the Declaration of Independence represents Enlightenment philosophical principles applied to political theory, specifically natural rights philosophy influenced by John Locke."

**Common Classification Systems:**

- **Library Classifications:** Dewey Decimal, Library of Congress
- **Discipline-Specific:** MLA genre categories, medical taxonomy, etc.
- **Rhetorical:** Modes of discourse (narrative, expository, persuasive, etc.)
- **Literary:** Genre, period, movement
- **Argument Types:** Deductive, inductive, analogical

**Difference from Tagging:**
- **Tagging:** Informal, personal, flexible keywords
- **Classifying:** Formal, standardized, hierarchical categories

**Best Practices:**
- Use established classification systems consistently
- Check with your instructor about which systems to use
- Document your classification criteria
- Be consistent across annotations
- Explain your classification choices

---

### 8. Identifying

**Purpose:** Name and recognize specific entities like people, places, organizations, or concepts

**When to Use:**
- Identifying historical figures
- Recognizing place names
- Noting organizations or institutions
- Marking conceptual references
- Named entity recognition
- Building indices

**How to Create:**
1. Select the text passage (usually a name or term)
2. Choose "Identify" from the annotation menu
3. Provide the full identification
4. Add relevant details (dates, descriptions, etc.)
5. Submit

**Example:**
> **Selected Text:** "the Bard"
> 
> **Identification:** William Shakespeare (1564-1616)
> 
> **Details:** "English playwright and poet, widely regarded as the greatest writer in the English language. 'The Bard' is a common epithet for Shakespeare, referring to the ancient Celtic tradition of bards as poets and storytellers. The author uses this reference to invoke Shakespeare's authority on matters of human nature and drama."

**Types of Entities to Identify:**

1. **People:**
   - Historical figures
   - Authors and artists
   - Public figures
   - Characters (when referenced by nickname or epithet)

2. **Places:**
   - Geographic locations
   - Historical sites
   - Fictional locations
   - Institutions

3. **Organizations:**
   - Government bodies
   - Companies
   - Movements
   - Institutions

4. **Concepts:**
   - Philosophical concepts
   - Technical terms
   - Theories and methods
   - Cultural references

5. **Events:**
   - Historical events
   - Cultural moments
   - Referenced occurrences

**Best Practices:**
- Provide full, formal names
- Include dates when relevant
- Explain why this identification matters
- Disambiguate (if multiple people/places share a name)
- Add context for unfamiliar references
- Link to external resources if helpful

---

## Creating Annotations

### Basic Annotation Workflow

[Universal steps for creating any annotation]

**Step-by-Step Process:**

1. **Read the Passage:**
   - Understand the content before annotating
   - Consider context
   - Think about significance

2. **Select Your Target:**
   - Highlight the specific text
   - Be precise - not too much, not too little
   - Select the most relevant portion

3. **Choose Annotation Type:**
   - Consider your purpose
   - Select appropriate motivation
   - Match type to your intent

4. **Compose Your Annotation:**
   - Write clearly and thoughtfully
   - Support your points
   - Be specific

5. **Review and Submit:**
   - Proofread for clarity
   - Check for completeness
   - Submit your annotation

### Selecting Text

**How Much to Select?**

**Too Little:**
```
"This suggests..."
```
❌ Not enough context - what does "this" refer to?

**Too Much:**
```
[Three full paragraphs selected]
```
❌ Unfocused - which part are you actually annotating?

**Just Right:**
```
"The juxtaposition of wealth and poverty in a single sentence"
```
✅ Specific, clear, focused

**Best Practices:**
- Select complete thoughts (full sentences or clauses)
- Include enough context to be understood standalone
- Be precise - select only what you're discussing
- For longer passages, consider multiple focused annotations

### Writing Effective Annotation Bodies

**Elements of a Good Annotation:**

1. **Clear Focus:** Make your point obvious
2. **Evidence/Support:** Back up claims with reasoning
3. **Context:** Explain relevance
4. **Engagement:** Invite response or further thinking
5. **Clarity:** Write for your audience

**Annotation Templates:**

**For Commentary:**
```
[Observation] + [Evidence/Reasoning] + [Significance]

Example: "This metaphor comparing time to a river emphasizes 
the irreversible nature of change. The flowing water imagery 
suggests continuous movement in one direction, which supports 
the novel's theme of inevitable historical progression."
```

**For Questions:**
```
[What's unclear] + [Why it matters] + [Invitation to discuss]

Example: "I'm confused about the narrator's motivation here - 
earlier they said X, but now they're doing Y. Is this meant to 
show character development, or is it highlighting the narrator's 
unreliability? What do others think?"
```

**For Analysis:**
```
[Claim] + [Evidence] + [Interpretation] + [Connection]

Example: "The author uses religious imagery throughout this 
section (words like 'sacred,' 'ritual,' 'devotion'), which 
elevates the mundane act of letter-writing to something 
spiritual. This suggests the character views communication 
itself as a sacred duty, connecting to the novel's broader 
theme about the power of language."
```

---

## Advanced Annotation Techniques

### Multi-Part Annotations

[Creating complex annotations that combine multiple types]

**Example: Tag + Comment + Link**

> **Selected Text:** "The iron curtain has descended across the continent."
> 
> **Tags:** `#cold-war` `#metaphor` `#churchill`
> 
> **Comment:** "Churchill's famous metaphor from his 1946 'Sinews of Peace' speech. The iron curtain image powerfully conveys both the impenetrability and the oppressive weight of Soviet control in Eastern Europe."
> 
> **Link:** [To another document about post-WWII Europe]

### Threaded Discussions

[Building extended conversations through annotations]

**Creating Productive Threads:**

1. **Initial Annotation:** Pose a thoughtful question or observation
2. **First Replies:** Classmates respond with different perspectives
3. **Follow-Ups:** Continue the conversation, synthesize ideas
4. **Synthesis:** Someone summarizes the discussion insights

**Example Thread:**

```
👤 Student A (Question): "Why does the author repeat this phrase three times?"

  ↳ 👤 Student B (Reply): "Maybe for emphasis? It's definitely memorable."
  
    ↳ 👤 Student C (Reply): "I think it's more than emphasis - the rule of 
       three is a classic rhetorical device. Each repetition builds intensity."
       
      ↳ 👤 Student A (Reply): "Good point! And each time the phrase appears, 
         the context gets darker, so the repetition tracks the escalating danger."
         
        ↳ 👩‍🏫 Instructor (Reply): "Excellent analysis, all. You've identified 
           both the rhetorical strategy AND its thematic function. This kind of 
           close reading is exactly what we're aiming for."
```

### Annotation Chains

[Linking related annotations across a document]

Use linking annotations to create "chains" of related observations throughout a text.

**Example:**
- Annotate the first appearance of a symbol
- Link each subsequent appearance back to the original
- Track how the symbol evolves
- Synthesize at the end

### Comparative Annotation

[Annotating multiple texts together]

**When comparing texts:**

1. Annotate similarities and differences
2. Use linking to connect parallel passages
3. Tag common themes
4. Synthesize insights across texts

**Use Cases:**
- Comparing different translations
- Analyzing multiple primary sources
- Examining different interpretations
- Tracking development across drafts

---

## Collaborative Annotation

### Social Annotation Strategies

[Making the most of collaborative features]

**Individual → Social Workflow:**

1. **First Pass - Individual:**
   - Read and annotate on your own
   - Record initial reactions
   - Note confusions

2. **Second Pass - Social:**
   - Read classmates' annotations
   - Respond to interesting points
   - Answer questions you can address

3. **Third Pass - Synthesis:**
   - Integrate new perspectives
   - Revise your understanding
   - Contribute synthesis annotations

### Building on Others' Ideas

**How to Engage Productively:**

**✅ Good Replies:**
- "Building on your point about X, I noticed Y..."
- "That's an interesting interpretation. An alternative could be..."
- "This connects to what [Classmate] said about..."
- "Great question! I think the answer might be..."

**❌ Avoid:**
- "I agree." [with nothing more]
- "No, you're wrong." [without explanation]
- Repeating what someone already said
- Off-topic tangents

### Instructor Interaction

[Engaging with instructor annotations]

**When Instructors Annotate:**
- They're modeling good annotation practices
- Highlighting important concepts
- Correcting misunderstandings
- Asking thought-provoking questions
- Providing additional context

**How to Respond:**
- Answer instructor questions thoughtfully
- Ask for clarification if needed
- Build on instructor insights
- Apply instructor feedback to later annotations

---

## Annotation Best Practices

### For Students

**Do:**
- ✅ Read carefully before annotating
- ✅ Be specific and focused
- ✅ Support your claims with evidence
- ✅ Engage genuinely with the text
- ✅ Respond to classmates thoughtfully
- ✅ Ask authentic questions
- ✅ Revise your thinking based on discussion
- ✅ Use appropriate annotation types
- ✅ Connect to course concepts
- ✅ Be respectful in disagreements

**Don't:**
- ❌ Annotate just to meet a quota
- ❌ Simply summarize without analysis
- ❌ Make vague or generic comments
- ❌ Ignore classmates' annotations
- ❌ Post inappropriate content
- ❌ Plagiarize or use AI without permission
- ❌ Be disrespectful to others
- ❌ Go completely off-topic
- ❌ Leave questions unanswered that you could address
- ❌ Annotate without reading carefully first

### For Instructors

**Effective Annotation Assignment Design:**

1. **Set Clear Expectations:**
   - Specify number and types of annotations required
   - Provide rubrics
   - Give due dates for initial annotations and replies
   - Model good annotations yourself

2. **Scaffold Learning:**
   - Start with guided annotations
   - Provide example annotations
   - Give specific prompts initially
   - Gradually increase complexity

3. **Encourage Discussion:**
   - Ask open-ended questions
   - Respond to student annotations
   - Highlight excellent examples
   - Facilitate debate and synthesis

4. **Assess Thoughtfully:**
   - Value quality over quantity
   - Assess both initial annotations and replies
   - Credit thoughtful questions, not just answers
   - Recognize intellectual risk-taking

**Sample Rubric Criteria:**
- Specificity and focus
- Use of evidence
- Critical thinking/analysis
- Engagement with classmates
- Use of appropriate annotation types
- Connection to course concepts
- Writing quality

### For All Users

**Writing Quality:**
- Use complete sentences
- Proofread for clarity
- Format for readability (paragraphs, not walls of text)
- Use proper grammar and spelling
- Write professionally but authentically

**Netiquette:**
- Be respectful and constructive
- Assume good intentions
- Disagree with ideas, not people
- Acknowledge others' contributions
- Use appropriate tone
- Follow classroom community guidelines

**Academic Integrity:**
- Do your own thinking and writing
- Cite sources when drawing on outside information
- Don't plagiarize classmates' annotations
- Use AI tools only if explicitly permitted
- Be honest in your engagement

---

## Technical Details

### Annotation Data Structure

[For technical users and developers]

**Web Annotation Model:**

Each annotation in Genji follows the W3C Web Annotation Data Model:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "http://example.org/annotations/1",
  "type": "Annotation",
  "motivation": "commenting",
  "creator": {
    "id": "http://example.org/users/123",
    "name": "Jane Student"
  },
  "created": "2025-10-30T12:00:00Z",
  "target": {
    "source": "http://example.org/documents/456",
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "Selected text here",
      "prefix": "text before...",
      "suffix": "...text after"
    }
  },
  "body": {
    "type": "TextualBody",
    "value": "This is the annotation content",
    "format": "text/plain"
  }
}
```

**Key Components:**

- **@context:** Links to the annotation vocabulary
- **id:** Unique identifier for this annotation
- **type:** Always "Annotation"
- **motivation:** The annotation type (commenting, questioning, etc.)
- **creator:** User who created the annotation
- **created:** Timestamp
- **target:** What is being annotated (document + text selection)
- **body:** The annotation content

### Supported Motivations

[Technical list from the codebase]

Based on the Genji codebase, these motivations are defined:

1. `commenting` - General comments
2. `questioning` - Questions
3. `replying` - Replies to other annotations
4. `tagging` - Keywords/tags
5. `linking` - Cross-references
6. `describing` - Descriptions/explanations
7. `classifying` - Formal classifications
8. `identifying` - Entity identification

### Storage and Retrieval

[How annotations are stored]

**Database Structure:**
- Annotations table stores annotation metadata
- Links to users (creator)
- Links to documents (target)
- Links to document elements (specific paragraphs/sections)
- Stores body content as text
- Indexed for search and retrieval

**See Also:** [Database Schema](../database/SCHEMA.md) for detailed table structures

### API Endpoints

[For developers]

**Key Annotation Endpoints:**
- `GET /annotations` - List annotations
- `POST /annotations` - Create annotation
- `GET /annotations/{id}` - Get specific annotation
- `PUT /annotations/{id}` - Update annotation
- `DELETE /annotations/{id}` - Delete annotation
- `GET /documents/{id}/annotations` - Get all annotations for a document

**See Also:** [API Documentation](../api/OVERVIEW.md) for complete API reference

---

## Examples and Use Cases

### Use Case 1: Close Reading Assignment

**Assignment:** Annotate a poem with attention to literary devices

**Student Approach:**
1. **First annotation (Identifying):**
   - Select: "the road less traveled by"
   - Identify as allusion to Frost's most famous line
   - Explain significance

2. **Second annotation (Tagging + Commenting):**
   - Select: Extended metaphor about roads
   - Tags: `#metaphor` `#choice` `#individuality`
   - Comment: Analyze how the road metaphor represents life choices

3. **Third annotation (Linking):**
   - Select: Reference to diverging paths
   - Link to another poem in the collection with similar imagery
   - Explain the connection

### Use Case 2: Historical Document Analysis

**Assignment:** Analyze primary sources from the Civil Rights Movement

**Student Approach:**
1. **Describing annotations:** Define historical terms and context
2. **Classifying annotations:** Categorize document type, rhetorical strategies
3. **Commenting annotations:** Analyze rhetorical effectiveness
4. **Linking annotations:** Connect to other historical documents
5. **Questioning annotations:** Ask about historical context and interpretation

### Use Case 3: Collaborative Discussion

**Assignment:** Build understanding through peer discussion

**Workflow:**
1. **Day 1:** Students read and create initial annotations (comments and questions)
2. **Day 2:** Students reply to 3+ classmates' annotations
3. **Day 3:** Students synthesize discussion in summary annotations
4. **Day 4:** In-class discussion builds on annotation threads

### Use Case 4: Comparative Analysis

**Assignment:** Compare two translations of the same text

**Student Approach:**
1. Use comparison view to see texts side-by-side
2. **Tag annotations:** Mark interesting differences (`#translation-choice` `#meaning-shift`)
3. **Linking annotations:** Connect parallel passages
4. **Commenting annotations:** Analyze why translators made different choices
5. **Synthesis annotation:** Overall assessment of translation strategies

### Use Case 5: Research Project

**Assignment:** Annotate sources for a research paper

**Student Approach:**
1. **Tagging:** Organize sources by theme, argument, methodology
2. **Identifying:** Note key figures, concepts, studies
3. **Describing:** Explain methodologies and findings
4. **Linking:** Connect related sources
5. **Commenting:** Evaluate source quality and relevance
6. Use annotations as basis for literature review

---

## Glossary

**Annotation:** A note, comment, or other addition to a text

**Annotation Body:** The content of an annotation (your comment, question, tag, etc.)

**Annotation Target:** What is being annotated (selected text, document element)

**Motivation:** The purpose or type of an annotation (commenting, questioning, etc.)

**Thread:** A conversation consisting of an annotation and its replies

**Tag:** A keyword or label applied to text

**Link:** A connection to another document or resource

**Web Annotation Data Model:** W3C standard for representing annotations

**Selector:** Technical specification of exactly what text is being annotated

**Text Quote Selector:** Annotation targeting method that uses exact text matches

---

## Additional Resources

### Related Guides

- [User Guide](USER_GUIDE.md) - General platform overview
- [Student Guide](STUDENT_GUIDE.md) - For students
- [Instructor Guide](INSTRUCTOR_GUIDE.md) - For instructors
- [Administrator Guide](ADMIN_GUIDE.md) - For system administrators

### External Resources

**About Annotation:**
- [Hypothes.is Guide to Social Annotation](https://web.hypothes.is)
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [NCTE on Annotation](https://ncte.org) - National Council of Teachers of English

**About Close Reading:**
- Academic writing centers (your institution)
- Digital humanities annotation guides
- [Resource links as appropriate]

---

**Questions?** Refer to the [User Guide](USER_GUIDE.md) or contact your instructor.

**For developers:** See [API Documentation](../api/OVERVIEW.md) and [System Overview](../architecture/SYSTEM_OVERVIEW.md)
