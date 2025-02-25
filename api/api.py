from waitress import serve
import falcon

class HealthCheckResource:
   def on_get(self, req, resp):
    """Handles GET requests"""
    resp.status = falcon.HTTP_200
    resp.media = {"status": "healthy"} 

app = falcon.App()
app.add_route("/", HealthCheckResource())

if __name__ == '__main__':
   serve(app, host='0.0.0.0', port=3000)