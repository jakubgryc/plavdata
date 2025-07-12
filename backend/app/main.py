from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api import personal_bests
from app.api import swimmers


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(personal_bests.router, prefix="/api")
app.include_router(swimmers.router, prefix="/api")


@app.get("/")
async def read_root():
    return {"message": "Hello, world"}
