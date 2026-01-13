# Deploying to GKE: Step-by-Step Guide

## Overview

This guide walks you through deploying a multi-container application to Google Kubernetes Engine (GKE). The application consists of:

- **PostgreSQL** — Database with PGroonga extension
- **Migrations** — Database schema migrations (runs as a Job)
- **API** — Backend service
- **UI** — Frontend application with nginx proxy

The UI container includes an nginx configuration that proxies `/api/v1/` requests to the backend API service, so both frontend and backend are accessible through a single endpoint.

## Environment

We'll use **Google Cloud Shell**, a browser-based terminal with all necessary tools pre-installed:

- `gcloud` CLI (already authenticated)
- `kubectl`
- Docker

### Accessing Cloud Shell

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project from the project dropdown
3. Click the **Cloud Shell** icon (terminal icon) in the top-right toolbar
4. A terminal session will open at the bottom of your browser

---

## Part 1: Create GKE Cluster

### 1.1 Verify your project

```bash
gcloud config get-value project
```

### 1.2 Find your preferred zone

```bash
gcloud compute zones list
```

### 1.3 Create the cluster

```bash
gcloud container clusters create <CLUSTER_NAME> \
  --zone <ZONE> \
  --num-nodes 2 \
  --machine-type e2-medium
```

This takes a few minutes to complete.

### 1.4 Get credentials for kubectl

```bash
gcloud container clusters get-credentials <CLUSTER_NAME> --zone <ZONE>
```

### 1.5 Verify connection

```bash
kubectl get nodes
```

You should see your 2 nodes listed.

---

## Part 2: Retrieve Kubernetes Manifests

**[Retrieve the Kubernetes manifest files from your source repository or shared location]**

You should have the following files:

| File | Purpose |
|------|---------|
| `postgres.yml` | Database deployment, service, secrets, ConfigMap, and persistent storage |
| `migrations-job.yml` | Database migration job |
| `api.yml` | API deployment and service |
| `ui.yml` | UI deployment and service |

---

## Part 3: Configure Manifests

### 3.1 Update image references

Ensure each manifest references the correct Artifact Registry images:

```yaml
image: <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY_NAME>/<IMAGE_NAME>:<TAG>
```

### 3.2 Configure secrets

The `postgres.yml` file contains a Secret for the database password [2]:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgresql
type: Opaque
stringData:
  POSTGRES_PASSWORD: <YOUR_PASSWORD>
```

### 3.3 Configure the ConfigMap

Verify the `postgresql-config` ConfigMap has correct values [2]:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-config
data:
  POSTGRES_USER: postgres
  POSTGRES_DB: myapp
```

### 3.4 Verify environment variables

The API and migrations job use `SQLALCHEMY_DATABASE_URL` to connect to the database [1][3]:

```yaml
env:
- name: SQLALCHEMY_DATABASE_URL
  value: postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgresql:5432/$(POSTGRES_DB)
```

---

## Part 4: Deploy to GKE

### 4.1 Deploy Postgres

```bash
kubectl apply -f postgres.yml
```

### 4.2 Wait for Postgres to be ready

```bash
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=120s
```

### 4.3 Run migrations

```bash
kubectl apply -f migrations-job.yml
```

### 4.4 Wait for migrations to complete

```bash
kubectl wait --for=condition=complete job/db-migrations --timeout=120s
```

### 4.5 Check migration logs

```bash
kubectl logs job/db-migrations
```

### 4.6 Deploy API and UI

```bash
kubectl apply -f api.yml
kubectl apply -f ui.yml
```

### 4.7 Check all pods are running

```bash
kubectl get pods
```

### 4.8 Get the external IP

```bash
kubectl get svc ui --watch
```

Wait for `EXTERNAL-IP` to change from `<pending>` to an IP address. Press `Ctrl+C` to stop watching.

---

## Part 5: Useful Commands

### Check pod status

```bash
kubectl get pods
```

### Check logs

```bash
kubectl logs <POD_NAME>
kubectl logs job/db-migrations
```

### Describe a pod (for debugging)

```bash
kubectl describe pod <POD_NAME>
```

### Delete and rerun migrations

```bash
kubectl delete job db-migrations
kubectl apply -f migrations-job.yml
```

### Restart a deployment

```bash
kubectl rollout restart deployment <DEPLOYMENT_NAME>
```

---

## Key Notes

1. **GKE can pull from Artifact Registry automatically** — No image pull secrets are needed when both are in the same project.

2. **Environment variable substitution** — Kubernetes resolves `$(VAR_NAME)` in env values, allowing you to build connection strings dynamically.

3. **Deployment order matters** — Postgres must be ready before migrations run, and migrations should complete before the API starts.

4. **LoadBalancer service** — The UI service creates an external IP automatically; this takes 1-2 minutes to provision.

5. **Migration job cleanup** — The job is configured with `ttlSecondsAfterFinished: 3600`, so it will be automatically deleted 1 hour after completion.