# Deploying genji-lab to Google Cloud Platform (GCP)

## Introduction

This guide walks you through deploying **genji-lab** to Google Kubernetes Engine (GKE). While genji-lab can run in various environments, this guide focuses on containerized deployment using Kubernetes—a powerful system for running applications at scale.

Assuming you have a GCP Project with billing enabled, these steps should take less than an hour. Allow more time if you work on the command line infrequently.

### What We're Actually Doing (The Big Picture)

Deploying a containerized application involves several key concepts:

1. **Container Images** — Your application code packaged with everything it needs to run (dependencies, runtime, etc.). Think of it like a shipping container: standardized, portable, and self-contained.

2. **Container Registry** — A storage location for your container images. Google Cloud's version is called **Artifact Registry**. Before Kubernetes can run your app, it needs to pull the images from somewhere.

3. **Kubernetes Cluster** — A group of machines (nodes) managed by Kubernetes that will actually run your containers. Kubernetes handles starting containers, restarting them if they crash, scaling, networking, and more.

4. **Kubernetes Manifests** — YAML files that describe *what* you want to run and *how*. You tell Kubernetes "I want 2 copies of my API running" and it makes it happen.

### genji-lab Architecture

genji-lab consists of four components :

| Component | Purpose |
|-----------|---------|
| **PostgreSQL** | Database with PGroonga extension for data storage |
| **Migrations** | One-time job that sets up the database schema |
| **API** | Backend service that handles business logic |
| **UI** | Frontend application served via nginx |

The UI includes an nginx configuration that proxies `/api/v1/` requests to the backend, so users access everything through a single URL .

---

## Prerequisites

- A [Google Cloud Platform (GCP) account](https://cloud.google.com/cloud-console) with billing enabled
- A project created in GCP
- Basic familiarity with the command line

__NOTE:__ If you get stuck, take a look at the Useful Commands Reference at the end of these docs.
---

## Part 1: Set Up Your Environment

We'll use **Google Cloud Shell**, a browser-based terminal that comes pre-configured with all the tools we need .

### 1.1 Access Cloud Shell

1. Navigate to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project from the dropdown at the top
3. Click the **Cloud Shell** icon (terminal icon) in the top-right toolbar
4. A terminal session opens at the bottom of your browser

**Why Cloud Shell?** It has `gcloud`, `kubectl`, and Docker pre-installed and pre-authenticated. No local setup required.

### 1.2 Verify Your Project

```bash
gcloud config get-value project
```

This confirms which GCP project will be billed and where resources will be created. If it shows the wrong project or no project at all, run:

```bash
gcloud config set project <YOUR_PROJECT_ID>
```

The project ID will have the format `<NAME>-<GOOGLE-GENERATED-ID-NUMBER>`

---

## Part 2: Clone the Repository

### 2.1 Clone genji-lab

```bash
git clone https://github.com/dartmouth/genji-lab.git
cd genji-lab
```

**Why?** The repository contains:
- Application source code
- Dockerfiles for building container images
- Kubernetes manifests (in the `manifests/` folder) that describe how to deploy each component

### 2.2 Verify the manifests exist

```bash
ls manifests/
```

You should see :
```
postgres.yml
migrations-job.yml
api.yml
ui.yml
```

These YAML files tell Kubernetes exactly how to run each component of genji-lab.

---

## Part 3: Create a Container Registry

Before Kubernetes can run our application, we need somewhere to store our container images. **Artifact Registry** is Google Cloud's container registry service.

### 3.1 Enable the Artifact Registry API

```bash
gcloud services enable artifactregistry.googleapis.com
```

After running the enable command, you should see a return a message like, "Operation "operations/acat.XXXXXXX" finished successfully.

**Why?** GCP services must be explicitly enabled before use. This "turns on" Artifact Registry for your project.

### 3.2 Create a repository

A repository is like a folder in the Artifact Registry that holds data. In the following command, replace `<REGION>` with your preferred region (e.g., `us-central1`, `europe-west1`). Choose a region close to your anticipated users for better performance.

Make a note of the selected region -- you will need it again later!

```bash
gcloud artifacts repositories create genji-lab-repo \
  --repository-format=docker \
  --location=<REGION> \
  --description="Container images for genji-lab"
```


**Why?** This creates a "folder" in Artifact Registry specifically for Docker images. You can have multiple repositories for different projects.

---

## Part 4: Build and Push Container Images with Cloud Build

Now we'll package each component of genji-lab into container images and upload them to our registry. We'll use **Google Cloud Build** instead of building locally—this is more reliable in Cloud Shell and handles authentication automatically.

### 4.1 Enable the Cloud Build API

```bash
gcloud services enable cloudbuild.googleapis.com
```

**Why?** Cloud Build is Google's managed service for building container images. It runs the build on Google's infrastructure, which is faster and more reliable than building in Cloud Shell (which has limited resources and can time out).

### 4.2 Set environment variables for convenience

Replace the `<REGION>` placeholder in the following command with the region you selected in 3.2.

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=<REGION>
export REPO=genji-lab-repo
export TAG=v1.0.0
```

**Why?** We'll reference these values multiple times. Variables prevent typos and make commands easier to read.

### 4.3 Build and push the PostgreSQL image

```bash
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/postgres:${TAG} \
  ./postgres

```

**Why?**
- `gcloud builds submit` uploads your source code to Cloud Build
- Cloud Build reads the Dockerfile and creates an image containing PostgreSQL with the PGroonga extension
- The image is automatically pushed to Artifact Registry when the build completes
- No need to configure Docker authentication—Cloud Build handles it

### 4.4 Build and push the migrations image

```bash
gcloud builds submit \
  --config=k8s/cloudbuild-migrations.yaml \
  --substitutions=_TAG=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/migrations:${TAG} \
  ./api
```

### 4.5 Build and push the API image

```bash
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/api:${TAG} \
  ./api
```

### 4.6 Build and push the UI image

```bash
gcloud builds submit \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/ui:${TAG} \
  ./core-ui
```

### 4.7 Verify images were pushed

```bash
gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}
```

You should see all four images listed. These are now stored in the cloud and ready for Kubernetes to use.

---

## Part 5: Create a Kubernetes Cluster

A **Kubernetes cluster** is a set of machines (called **nodes**) that run your containerized applications. Google manages the control plane; you just specify how many nodes you want.

### 5.1 Enable the Kubernetes Engine API

```bash
gcloud services enable container.googleapis.com
```

**Why?** Like Artifact Registry, GKE must be enabled before use.

### 5.2 Find an appropriate zone

```bash
gcloud compute zones list
```

**Why?** Zones are physical locations within regions. Choose one close to your users or within your preferred region.

### 5.3 Create the cluster

In the following command, replace `<ZONE>` with your chosen zone (e.g., `us-central1-a`).

```bash
gcloud container clusters create genji-lab-cluster \
  --zone <ZONE> \
  --num-nodes 2 \
  --machine-type e2-medium
```

**Why?** This creates two virtual machines that will run your containers . The `e2-medium` machine type provides a balance of CPU and memory suitable for small deployments. This process takes 3-5 minutes.

### 5.4 Get credentials for kubectl

In the following command, replace `<ZONE>` with your chosen zone (e.g., `us-central1-a`).

```bash
gcloud container clusters get-credentials genji-lab-cluster --zone <ZONE>
```

**Why?** `kubectl` is the command-line tool for interacting with Kubernetes . This command configures `kubectl` to talk to your new cluster by downloading authentication credentials.

### 5.5 Verify the connection

```bash
kubectl get nodes
```

**Why?** This confirms `kubectl` can communicate with your cluster. You should see two nodes with status `Ready` .

---

## Part 6: Configure Kubernetes Manifests

The manifest files in `manifests/` describe your desired deployment, but they need to be updated with your specific image locations and configuration.

### 6.1 Update image references

Edit each manifest file to point to your Artifact Registry images :

```bash
cd manifests/
```

In `postgres.yml`, `migrations-job.yml`, `api.yml`, and `ui.yml`, update the `image:` field using your preferred command line editor (e.g. vim, nano):

```yaml
image: <REGION>-docker.pkg.dev/<PROJECT_ID>/genji-lab-repo/<IMAGE_NAME>:<TAG>
```
__NOTE__: If you used a name other than `genji-lab-repo` when you created the Artifact Registry Repository in Step 3.2, substitute that name for `genji-lab-repo` in the above pattern.

For example, in `api.yml`:
```yaml
spec:
  containers:
  - name: api
    image: us-central1-docker.pkg.dev/my-project/genji-lab-repo/api:v1.0.0
```

**Why?** Kubernetes needs to know exactly where to pull each container image from.

### 6.2 Configure database credentials

Open `postgres.yml` and locate the Secret resource. Update the password :

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgresql
type: Opaque
stringData:
  POSTGRES_PASSWORD: <CHOOSE_A_SECURE_PASSWORD>
```

**Why?** Secrets store sensitive information separately from your application code. Kubernetes makes this value available to containers that need it without exposing it in logs or environment dumps. 

Kubernetes Secrets are not infallible protection for sensitive data. Ensure that this is sufficient security for you and/or your organization before releasing the application publicly.

### 6.3 Verify the ConfigMap

In `postgres.yml`, check the ConfigMap has appropriate values :

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-config
data:
  POSTGRES_USER: postgres
  POSTGRES_DB: genjilab
```

**Why?** ConfigMaps store non-sensitive configuration. This keeps configuration separate from container images, so you can change settings without rebuilding images.

### 6.4 Understand environment variable references

The API and migrations use this pattern to build the database connection string :

```yaml
env:
- name: SQLALCHEMY_DATABASE_URL
  value: postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgresql:5432/$(POSTGRES_DB)
```

**Why?** Kubernetes automatically substitutes `$(VAR_NAME)` with actual values from Secrets and ConfigMaps. This allows you to compose configuration dynamically while keeping secrets secure.

---

## Part 7: Deploy to Kubernetes

Now we'll apply our manifests to the cluster. Order matters here—the database must be running before anything tries to use it .

### 7.1 Deploy PostgreSQL

```bash
kubectl apply -f postgres.yml
```

**What this does:** Sends the manifest to Kubernetes, which then:
- Creates the Secret and ConfigMap
- Provisions persistent storage for database files
- Starts the PostgreSQL container
- Creates a Service so other containers can connect to it

### 7.2 Wait for PostgreSQL to be ready

```bash
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=120s
```

**Why?** The database container needs time to start up and initialize . The `wait` command blocks until the pod is healthy, ensuring we don't proceed prematurely.

### 7.3 Run database migrations

```bash
kubectl apply -f migrations-job.yml
```

**What this does:** Creates a **Job**—a container that runs once and exits (unlike a Deployment, which keeps containers running forever). The migration job connects to PostgreSQL and creates the necessary tables and schema .

### 7.4 Wait for migrations to complete

```bash
kubectl wait --for=condition=complete job/db-migrations --timeout=120s
```

### 7.5 Verify migrations succeeded

```bash
kubectl logs job/db-migrations
```

**Why?** Checking logs confirms the migrations ran successfully . Look for success messages; if you see errors, you'll need to troubleshoot before proceeding.

### 7.6 Deploy the API

```bash
kubectl apply -f api.yml
```

**What this does:** Creates a **Deployment** (Kubernetes keeps the specified number of API containers running) and a **Service** (a stable network endpoint other containers can use to reach the API).

### 7.7 Deploy the UI

```bash
kubectl apply -f ui.yml
```

**What this does:** Deploys the frontend container and creates a **LoadBalancer Service**. Unlike internal services, a LoadBalancer gets a public IP address so users can access your application from the internet .

### 7.8 Verify all pods are running

```bash
kubectl get pods
```

**Why?** This shows the status of all containers . All pods should show `Running` status with `1/1` in the READY column.

Expected output:
```
NAME                         READY   STATUS      RESTARTS   AGE
postgresql-xxxxxxxxx-xxxxx   1/1     Running     0          5m
db-migrations-xxxxx          0/1     Completed   0          4m
api-xxxxxxxxx-xxxxx          1/1     Running     0          2m
ui-xxxxxxxxx-xxxxx           1/1     Running     0          1m
```

### 7.9 Get the external IP address

```bash
kubectl get svc ui --watch
```

**Why?** The LoadBalancer takes 1-2 minutes to provision a public IP . The `--watch` flag shows updates in real-time. Wait until `EXTERNAL-IP` changes from `<pending>` to an actual IP address, then press `Ctrl+C`.

### 7.10 Access your application

Open a browser and navigate to:
```
http://<EXTERNAL-IP>
```

🎉 **Congratulations!** genji-lab is now running on Google Kubernetes Engine.

---

## Part 8: Understanding What We Deployed

Here's a visual summary of how the components interact:

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  LoadBalancer   │
              │  (External IP)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │       UI        │
              │  (nginx proxy)  │
              └────────┬────────┘
                       │ /api/v1/*
                       ▼
              ┌─────────────────┐
              │       API       │
              │   (backend)     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │   (database)    │
              └─────────────────┘
```

---

## Part 9: Useful Commands Reference

### Viewing Resources

```bash
# List all pods
kubectl get pods

# List all services (shows IPs and ports)
kubectl get svc

# List everything
kubectl get all
```

### Debugging

```bash
# View logs for a pod
kubectl logs <POD_NAME>

# View logs for the migration job
kubectl logs job/db-migrations

# Get detailed info about a pod (useful when pods won't start)
kubectl describe pod <POD_NAME>

# Open a shell inside a running container
kubectl exec -it <POD_NAME> -- /bin/sh
```

### Making Changes

```bash
# Restart a deployment (pulls fresh images if using :latest tag)
kubectl rollout restart deployment <DEPLOYMENT_NAME>

# Delete and rerun migrations
kubectl delete job db-migrations
kubectl apply -f migrations-job.yml

# Apply changes to a manifest
kubectl apply -f <FILENAME>.yml
```

### Cleanup

```bash
# Delete all genji-lab resources
kubectl delete -f manifests/

# Delete the entire cluster (stops all billing for the cluster)
gcloud container clusters delete genji-lab-cluster --zone <ZONE>
```

---

## Key Concepts Recap

| Term | What It Is |
|------|------------|
| **Pod** | The smallest deployable unit in Kubernetes; usually one container |
| **Deployment** | Ensures a specified number of pod replicas are always running |
| **Service** | A stable network endpoint for accessing pods |
| **Job** | Runs a container to completion (for one iteration)
