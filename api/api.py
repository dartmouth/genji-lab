from waitress import serve
from dataclasses import dataclass
import falcon
import json
import re
import os

@dataclass
class Annotation:
    context: str
    id: str
    type: str
    creator: str
    created: str
    modified: str
    generator: str
    generated: str
    motivation: str
    body: str
    target: str

    @classmethod
    def load(cls, data):
        return cls(
            context=data.get("@context"),
            id=data.get("id"),
            type=data.get("type"),
            creator=data.get("creator"),
            created=data.get("created"),
            modified=data.get("modified"),
            generator=data.get("generator"),
            generated=data.get("generated"),
            motivation=data.get("motivation"),
            body=data.get("body"),
            target=data.get("target")
        )
    @property
    def content_id(self):
        return self.target['selector']['value']

@dataclass
class AnnotationCollection:
    annotations: list[Annotation]

    def save(self, path='data/annotations.json'):
        with open(path, 'w') as f:
            f.write(json.dumps([annotation.__dict__ for annotation in self.annotations]))
    def add_annotation(self, annotation):
        self.annotations.append(annotation)

    def get_annotations(self, content_id):
        return [annotation for annotation in self.annotations if annotation.content_id == content_id]

class AnnotationResource:
    def on_get(self, req, resp, cid):
        """Handles GET requests"""
        annotations = self.db.get_annotations(cid)

        resp.status = falcon.HTTP_200
        resp.media = annotations

    def on_post(self, req, resp):
        """Handles POST requests"""
        annotation = Annotation.load(req.media)
        self.db.add_annotation(annotation)

        resp.status = falcon.HTTP_201
        resp.media = annotation

    def on_put(self, req, resp):
        """Handles PUT requests"""
        resp.status = falcon.HTTP_200
        resp.media = {"annotation": "Hello World!"}

    def on_delete(self, req, resp):
        """Handles DELETE requests"""
        resp.status = falcon.HTTP_200
        resp.media = {"annotation": "Hello World!"}


class HealthCheckResource:
    def on_get(self, req, resp):
        """Handles GET requests"""
        resp.status = falcon.HTTP_200
        resp.media = {"status": "healthy"}


app = falcon.App()
app.add_route("/", HealthCheckResource())
app.add_route("/annotations", AnnotationResource())
app.add_route("/annotations/{cid}", AnnotationResource())

if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=3000)
