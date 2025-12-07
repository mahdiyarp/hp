FROM python:3.11-slim
WORKDIR /app

# Install system deps including tesseract and poppler for PDF->image
RUN apt-get update \
	 && apt-get install -y --no-install-recommends \
		 build-essential libpq-dev tesseract-ocr libtesseract-dev poppler-utils pkg-config libcairo2-dev libffi-dev dos2unix \
	 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Normalize Windows CRLF line endings to LF to avoid exec errors
RUN dos2unix /app/entrypoint.sh || true
RUN chmod +x /app/entrypoint.sh || true

EXPOSE 8000
CMD ["/app/entrypoint.sh"]
