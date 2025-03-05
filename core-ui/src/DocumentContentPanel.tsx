import React from 'react';


interface DocumentContentPanelProps {
    documentID: string;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ documentID }) => {
    // fetch content from server
    const content_list = [{
        "id": "P1",
        "document_collection_id": "TC1",
        "hierarchy": {
            "section": 1,
            "chapter": 1,
            "paragraph": 1
          },
        "content": {
            "text": "IN WHOSE reign was it that a woman of rather undistinguished lineage captured the heart of the Emperor and enjoyed his favor above all the other imperial wives and concubines? Certain consorts, whose high noble status gave them a sense of vain entitlement, despised and reviled her as an unworthy upstart from the very moment she began her service. Ladies of lower rank were even more vexed, for they knew His Majesty would never bestow the same degree of affection and attention on them. As a result, the mere presence of this woman at morning rites or evening ceremonies seemed to provoke hostile reactions among her rivals, and the anxiety she suffered as a consequence of these ever-increasing displays of jealousy was such a heavy burden that gradually her health began to fail.",
            "formatting": []
        },
        "metadata": {
            "created": "2025-02-24T10:51:38Z",
            "modified": "2025-02-24T10:51:38Z"
        }
    },
    {
        "id": "P2",
        "document_collection_id": "TC1",
        "hierarchy": {
            "section": 1,
            "chapter": 1,
            "paragraph": 2
        },
        "content": {
            "text": "His Majesty could see how forlorn she was, how often she returned to her family home. He felt sorry for her and wanted to help, and though he could scarcely afford to ignore the admonitions of his advisers, his behavior eventually became the subject of palace gossip. Ranking courtiers and attendants found it difficult to stand by and observe the troubling situation, which they viewed as deplorable. They were fully aware that a similarly ill-fated romance had thrown the Chinese state into chaos. Concern and consternation gradually spread through the court, since it appeared that nothing could be done. Many considered the relationship scandalous, so much so that some openly referred to the example of the Prize Consort Yang. The only thing that made it possible for the woman to continue to serve was the Emperor’s gracious devotion.",
            "formatting": []
        },
        "metadata": {
            "created": "2025-02-24T10:51:38Z",
            "modified": "2025-02-24T10:51:38Z"
        }
    },
    {
        "id": "P3",
        "document_collection_id": "TC1",
        "hierarchy": {
            "section": 1,
            "chapter": 1,
            "paragraph": 3
        },
        "content": {
            "text": "The woman’s father had risen to the third rank as a Major Counselor before he died. Her mother, the principal wife of her father, was a woman of old-fashioned upbringing and character who was well trained in the customs and rituals of the court. Thus, the reputation of her house was considered in no way inferior and did not suffer by comparison with the brilliance of the highest nobility. Unfortunately, her family had no patrons who could provide political support, and after her father’s death there was no one she could rely on. In the end, she found herself at the mercy of events and with uncertain prospects.",
            "formatting": []
        },
        "metadata": {
            "created": "2025-02-24T10:51:38Z",
            "modified": "2025-02-24T10:51:38Z"
        }
    }
    ]
    return (
        
        <div className='document-content-panel'>
            documentID: {documentID}
            <div className='document-content-container'>
                {content_list.map((content) => (
                    <div key={content.id} className='document-content'>
                        <div className='annotatable-paragraph'>
                            {content.content.text}
                        </div>
                    </div>
                ))}
            </div>
            
        </div>
    );
};

export default DocumentContentPanel;