from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    text: str = Field(max_length=10000)


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    topic: str | None = None
    topic_confidence: float | None = None
    message: str
