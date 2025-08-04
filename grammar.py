# app.py
from fastapi import FastAPI, Request,UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import asyncio
import time
import os

import mammoth

app = FastAPI()

# Allow your React dev server to talk to this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for demo purposes
_jobs = {}

@app.post("/grammar/submit-task")
async def submit_task(request: Request, file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())

    # Save uploaded file temporarily
    temp_path = f"temp_{job_id}.docx"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    # Convert DOCX to HTML using mammoth
    with open(temp_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        html_content = result.value  # The generated HTML
        messages = result.messages   # Any conversion warnings/errors

    # Clean up the temp file
    os.remove(temp_path)

    _jobs[job_id] = {
        "status": "processing",
        "chunks_sent": 0,
        "start_time": time.time(),
    }

    return JSONResponse({
        "jobid": job_id,
        "html_original": html_content
    })


@app.get("/grammar/job_status")
async def job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return JSONResponse({"status": "not_found"}, status_code=404)

    # After 10 seconds from submission, mark completed
    if time.time() - job["start_time"] > 10:
        job["status"] = "grammar_completed"

    return JSONResponse({"status": job["status"]})


async def grammar_streamer(job_id: str):
    """
    Generator to yield SSE chunks of corrected HTML.
    """
    job = _jobs.get(job_id)
    if not job:
        yield "event: error\ndata: Job not found\n\n"
        return

    # Dummy chunks to stream
    chunks = [
        "<p>codeshare agreement, also known simply as codeshare, is a business arrangement, common in the </p>",
        "<p>in which two or more airlines publish and market the same flight u.</p>",
        "<p>airline designator and flight number  as part of their published timetable.</p>"

    ]

    for chunk in chunks:
        # Wait a bit between chunks
        await asyncio.sleep(2)
        job["chunks_sent"] += 1
        yield f"data: {chunk}\n\n"

    # Close the stream
    yield "event: end\ndata: finished\n\n"

@app.get("/grammar/stream/{job_id}")
async def stream_corrections(job_id: str):
    """
    SSE endpoint. Client should listen for `message` events.
    """
    return StreamingResponse(
        grammar_streamer(job_id),
        media_type="text/event-stream"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", reload=True, port=8000)
