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
    print(job_id)
    print(request)
    if not file:
        return JSONResponse({"error": "No file uploaded"}, status_code=400)

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
  "<p><strong>TOPIC 6:</strong> How the Partition in 1947 was not just a division of territory but also a division of hearts and how it affected the common people.</p>",
  "<p><strong>Objectives:</strong></p>",
  "<p>This project will make students of this generation aware of the reasons, processes, decisions involved in the partition of our country and the consequences of this tragic phenomenon. The purpose of this project would be to supplement and deepen this understanding of the partition.</p>",
  "<p>It will help the students empathize and look at this event from the eyes of those who experienced it and were affected by it.</p>",
  "<p>It will enable them to understand and comprehend the hardships borne by the people during partition.</p>",
  "<p>It will help students critically analyze the importance of the experiences of people as a source for rebuilding the past.</p>",
  "<p>It will familiarize them with the perceptions to people about the partition today.</p>",
  "<p><strong>Methodology:</strong></p>",
  "<p>As a part of their holiday assignment, the students could be asked to read/watch one or more of the books mentioned in the Sources section of the textbook. They could also go through the anecdotes in the textbook (even the Political Science textbook- Indian Politics since Independence has anecdotes in the first chapter itself).</p>",
  "<p><strong>Data Collection</strong></p>",
  "<p>Each student can ask their grandparents or other elders about their experiences of Partition. Questions such as the following could be asked:</p>",
  "<p>Where were you living and what were you doing (school/college student, employed, married etc.) when the Partition took place?</p>",
  "<p>Were you required to migrate? Or were you in a locality from where others migrated and then new people came?</p>",
  "<p>Share some experiences related to Partition – was it a period full of violence and riots?</p>",
  "<p>What were the different changes that partition brought about?</p>",
  "<p>What do you feel about it today?</p>",
  "<p>The students should note that these are just some examples of questions that could be asked. They are free to innovate and come up with their own questions. Also, open-ended questions should be asked so that the respondents can freely express themselves and emotionally connect to their narration if possible. The experiences should be meticulously recorded (use the recorder in your mobile phone).</p>",
  "<p>After this each student could prepare a set of three to five questions about how individuals relate to the Partition and what they think of it today (do run the questions past your teacher). This survey-like study could be carried out in the locality or it could also be done in schools. The reasons behind a person’s opinion should also be noted. Again, people from different communities could be consulted so as to get a complete picture (talk to at least 10 people).</p>",
  "<p>After this primary researching, the students should discuss the findings. A group leader would speak about the gist of a discussion and the inferences drawn from it.</p>",
  "<p>Based on these findings, the students could either write a report or a story individually.</p>",
  "<p>Simultaneously, the group could decide on one or two anecdotes and make a script for a play.</p>",
  "<p><strong>Presentation:</strong></p>",
  "<p>The report that the students submit should be concise & well organized. Interviews can be recorded and played by the students for a better impact in both types of presentations.</p>",
  "<p>As for the play/skit, students can experiment with props and costumes as well. The skit could include songs and poems (if possible).</p>",
  "<p><strong>Assessment:</strong></p>",
  "<p><strong>Participation in discussions</strong> – 3 marks</p>",
  "<p><strong>Originality and understanding reflected while researching</strong> – 3 marks</p>",
    ]

    for chunk in chunks:
        # Wait a bit between chunks
        await asyncio.sleep(0.5)
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
