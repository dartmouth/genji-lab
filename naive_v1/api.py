# annotations_api.py
import falcon
from wsgiref.simple_server import make_server

from datetime import datetime

# Hardcoded annotations list - now we'll append to this
ANNOTATIONS = [
    {
        "@context": "http://www.w3.org/ns/anno.jsonld",
        "id": "comment1",
        "type": "Annotation",
        "creator": "http://example.org/user1",
        "body": {
            "type": "TextualBody",
            "value": "I guess there were lots of them?",
            "format": "text/html",
            "language": "en"
        },
        "target": [{
            "id": "comment1/target",
            "type": "Text",
            "source": "http://example.org/page1",
            "selector": {
                "type": "FragmentSelector",
                "value": "P1",
                "refinedBy": {
                    "type": "TextPositionSelector",
                    "start": 131,
                    "end": 174
                }
            }
        }]
    },
    {
        "@context": "http://www.w3.org/ns/anno.jsonld",
        "id": "comment2",
        "type": "Annotation",
        "creator": "http://example.org/user2",
        "body": {
            "type": "TextualBody",
            "value": "This is a comment on the second paragraph",
            "format": "text/html",
            "language": "en"
        },
        "target": [{
            "id": "comment2/target",
            "type": "Text",
            "source": "http://example.org/page1",
            "selector": {
                "type": "FragmentSelector",
                "value": "P2",
                "refinedBy": {
                    "type": "TextPositionSelector",
                    "start": 10,
                    "end": 50
                }
            }
        }]
    }
]

# Create a CORS middleware
class CORSComponent:
    def process_response(self, req, resp, resource, req_succeeded):
        resp.set_header('Access-Control-Allow-Origin', '*')
        resp.set_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        resp.set_header('Access-Control-Allow-Headers', 'Content-Type')

# Create resource for annotations
class AnnotationsResource:
    def on_get(self, req, resp):
        """Handle GET requests for annotations"""
        resp.media = ANNOTATIONS
        resp.status = falcon.HTTP_200

    def on_options(self, req, resp):
        """Handle OPTIONS requests for CORS preflight"""
        resp.status = falcon.HTTP_200

# Create resource for selections
class SelectionsResource:
    def on_post(self, req, resp):
        """Handle POST requests for new text selections"""
        try:
            # Parse the request body
            selection_data = req.media
            
            # Validate required fields
            required_fields = ['paragraphIds', 'start', 'end', 'selectedText']
            for field in required_fields:
                if field not in selection_data:
                    raise falcon.HTTPBadRequest(
                        title='Missing Field',
                        description=f'The field {field} is required'
                    )
            
            # Generate a unique ID for the new annotation
            annotation_id = f"comment{len(ANNOTATIONS) + 1}"
            
            # Create a new annotation from the selection
            new_annotation = {
                "@context": "http://www.w3.org/ns/anno.jsonld",
                "id": annotation_id,
                "type": "Annotation",
                "creator": "http://example.org/user_api",  # Default creator
                "created": datetime.utcnow().isoformat() + "Z",
                "body": {
                    "type": "TextualBody",
                    "value": f"Selection: {selection_data['selectedText']}",
                    "format": "text/html",
                    "language": "en"
                },
                "target": [{
                    "id": f"{annotation_id}/target",
                    "type": "Text",
                    "source": "http://example.org/page1",
                    "selector": {
                        "type": "FragmentSelector",
                        "value": selection_data['paragraphIds'][0],  # Use the first paragraph ID
                        "refinedBy": {
                            "type": "TextPositionSelector",
                            "start": selection_data['start'],
                            "end": selection_data['end']
                        }
                    }
                }]
            }
            
            # Add the new annotation to our list
            ANNOTATIONS.append(new_annotation)
            
            # Return the created annotation
            resp.media = new_annotation
            resp.status = falcon.HTTP_201
            
        except (ValueError, KeyError) as e:
            # Handle JSON parsing errors or missing keys
            raise falcon.HTTPBadRequest(
                title='Invalid JSON',
                description=str(e)
            )
    
    def on_options(self, req, resp):
        """Handle OPTIONS requests for CORS preflight"""
        resp.status = falcon.HTTP_200

# Health check endpoint
class HealthCheckResource:
    def on_get(self, req, resp):
        """Simple health check endpoint"""
        resp.media = {"status": "healthy"}
        resp.status = falcon.HTTP_200

# Create the Falcon application
app = falcon.App(middleware=[CORSComponent()])

# Add routes
app.add_route('/annotations', AnnotationsResource())
app.add_route('/selections', SelectionsResource())
app.add_route('/health', HealthCheckResource())

# Run the server
if __name__ == '__main__':
    with make_server('', 5000, app) as httpd:
        print('Serving on port 5000...')
        # Serve until process is killed
        httpd.serve_forever()