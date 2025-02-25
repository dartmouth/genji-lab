# Use the official Python image from the Docker Hub
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

COPY . .

# Install the required packages
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port that the app runs on
EXPOSE 3000

CMD ["waitress-serve", "--port=3000", "api:app"]