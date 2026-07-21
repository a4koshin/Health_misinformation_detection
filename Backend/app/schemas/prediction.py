from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    text: str = Field(max_length=10000)


class PredictResponse(BaseModel):
    prediction: str
