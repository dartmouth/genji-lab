from waitress import serve
from dataclasses import dataclass
import falcon
import json
import re
import os
import datetime


class AnnotationResource:
    def __init__(self):
        with open("data/annotations/annotations.json") as f:
            self.annotations = json.load(f)  
    def on_get(self, req, resp, cid):
        """Handles GET requests"""
        # annotations = self.db.get_annotations(cid)

        
        for anno in annotations:
            for target in anno['target']:
                if target['selector'].get("value", None) == cid:
                    resp.media = anno
                    return

        resp.status = falcon.HTTP_200
        resp.media = {}

    def on_post(self, req, resp):
        """Handles POST requests"""
        {}
        # get conent from request
        content = req.media
        # get current time in iso format
        now = datetime.datetime.now().isoformat()

        resp.status = falcon.HTTP_201
        resp.media = {"annotation": "Hello World!"}

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

class DocumentResource:
    def on_get(self, req, resp):
        """Handles GET requests"""
        with open("data/content/CONTENT_TC1.json") as f:
            content = json.load(f)
        resp.status = falcon.HTTP_200
        resp.media = content

with open("data/annotations/annotations.json") as f:
    annotations = json.load(f)

app = falcon.App()
app.add_route("/", HealthCheckResource())
app.add_route("/annotations", AnnotationResource())
app.add_route("/annotations/{cid}", AnnotationResource())
app.add_route("/documents", DocumentResource())

if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=3000)
