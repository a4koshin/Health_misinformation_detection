# 🩺 Health Misinformation Detection Using Machine Learning

> An AI-powered system for detecting health misinformation in Somali-language text, combining a fine-tuned **SomBERTb** transformer model, **Large Language Models (LLMs)**, and **retrieval-grounded verification** to classify Somali health claims as Reliable or Non-Reliable — with human oversight from a Healthcare Advisor review layer.

---

## 📌 Overview

Health misinformation is a growing challenge, especially on social media and online platforms where inaccurate or misleading medical information can spread quickly. This challenge is compounded for Somali speakers by a critical gap in language technology — Somali remains a low-resource language in Natural Language Processing, with very few existing tools capable of automatically verifying Somali-language health information.

This project analyzes **Somali-language health claims** and classifies them into two categories:

* ✅ **Reliable**
* ⚠️ **Non-Reliable**

The core prediction model is **SomBERTb**, a fine-tuned Transformer-based language model selected after comparing it against Logistic Regression, LinearSVC, and SomBERTa — SomBERTb achieved the strongest overall performance.

The system integrates **Large Language Models (LLMs)** as additional pipeline stages:

1. An LLM gatekeeper determines whether an input is **Medical** or **Non-Medical**.
2. Medical claims are passed to the **SomBERTb** classification model.
3. SomBERTb predicts whether the claim is **Reliable** or **Non-Reliable**.
4. For Reliable claims, an LLM generates a short confirming explanation.
5. For Non-Reliable claims, the system performs **live web retrieval** first, then an LLM generates corrective guidance that may only cite sources that were genuinely retrieved — preventing the model from inventing fake links.
6. Every Non-Reliable prediction is placed into a **Healthcare Advisor** review queue for human confirmation or correction.

---

## 🎯 Project Objectives

* Detect health misinformation in Somali-language text.
* Classify health claims as **Reliable** or **Non-Reliable**.
* Fine-tune and compare Transformer-based Somali language models (SomBERTa, SomBERTb) against traditional ML baselines (Logistic Regression, LinearSVC).
* Use LLMs to identify whether a claim is Medical or Non-Medical before classification.
* Ground Non-Reliable explanations in real, verifiable web sources rather than LLM-generated guesses.
* Provide human oversight through a Healthcare Advisor review workflow.
* Support Somali-language NLP research and AI development.

---

## 🧠 Complete System Workflow

```text
User Input (Somali text, or audio/video transcribed to text)
        ↓
Input Validation
        ↓
LLM Gatekeeper — Medical or Non-Medical?
        ↓
 ┌──────────────────────┐
 │                      │
 ▼                      ▼
Medical             Non-Medical
 │                      │
 ▼                      ▼
SomBERTb Model      Inform User / Stop
Prediction
 │
 ▼
Reliable or Non-Reliable
 │
 ┌───────┴────────┐
 ▼                ▼
Reliable      Non-Reliable
 │                │
 ▼                ▼
LLM confirms   Live web retrieval (DuckDuckGo)
evidence-based      ↓
message         LLM generates guidance citing
                 only verified retrieved sources
                     ↓
                 Healthcare Advisor Review Queue
                 (Confirm / Correct)
 │                │
 └───────┬────────┘
         ▼
    Final Result
```

---

## 🤖 SomBERTb-Based Prediction Model

The core model used for reliability classification is **SomBERTb**, a fine-tuned BERT-based Transformer model for Somali. Unlike traditional Machine Learning models that depend on manually engineered TF-IDF features, SomBERTb learns contextual representations directly from text through self-attention.

### Model Comparison

Four models were trained and evaluated under identical conditions to select the best-performing classifier:

| Model | Type | Accuracy | Precision | Recall | F1-score |
|---|---|---|---|---|---|
| Logistic Regression | Traditional ML (TF-IDF) | 94.42% | 95.77% | 92.19% | 93.94% |
| LinearSVC | Traditional ML (TF-IDF) | 94.74% | 95.48% | 93.21% | 94.33% |
| SomBERTa | Transformer | 96.73% | 96.60% | 96.43% | 96.52% |
| **SomBERTb** | Transformer | **97.13%** | **97.26%** | **96.60%** | **96.93%** |

**SomBERTb** was selected for deployment based on its highest overall F1-score.

### Classification Labels

* ✅ **Reliable**
* ⚠️ **Non-Reliable**

---

## 🔧 Model Fine-Tuning

```text
Pre-trained SomBERTb Model
        ↓
Somali Health Text Dataset
        ↓
Tokenization (max sequence length: 128 tokens)
        ↓
Train / Evaluation Split (80:20, stratified)
        ↓
Model Fine-Tuning
        ↓
Model Evaluation
        ↓
Best Model Selection
        ↓
Model Saving (Hugging Face Hub)
        ↓
Deployment (Flask backend)
```

---

## 📊 Dataset

The dataset consists of labelled Somali health-related text, combining authentic content transcribed from social media (Facebook, Instagram, TikTok) with translated claims from established public health misinformation datasets and trusted health institutions.

* Original dataset: **6,499** records
* Removed during cleaning (duplicates/invalid records): **227**
* Final cleaned dataset: **6,272** records

### Dataset Structure

| Column | Description |
|---|---|
| `ID` | Unique identifier for each record |
| `TEXT` | Somali health-related text |
| `LABEL` | Reliable or Non-Reliable |
| `LINK` | Source link, when available |

> Note: dataset class-distribution figures have varied slightly across project drafts — confirm the final authoritative split before citing it in any submitted document.

---

## 🧹 Data Preprocessing

* Removing empty and duplicate records.
* Checking missing values and invalid labels.
* Lowercasing, URL removal, mention removal, whitespace normalization.
* Splitting the dataset into training and evaluation sets (80:20, stratified).
* Tokenizing Somali text using the SomBERTb tokenizer (traditional models use TF-IDF instead).

---

## 📈 Model Evaluation

Models are evaluated using standard classification metrics:

* **Accuracy**
* **Precision**
* **Recall**
* **F1-Score**
* **Confusion Matrix**

---

## 🤖 LLM-Based Medical Claim Detection

Before a claim reaches SomBERTb, an LLM gatekeeper determines whether the submitted text is medical. This uses **Cerebras** (`gpt-oss-120b`) as the primary inference provider, automatically falling back to **Groq** (`llama-3.3-70b-versatile`) if the primary call fails — avoiding the need for a dedicated trained classifier for this coarse filtering step.

* 🩺 **Medical** → continues to SomBERTb for reliability classification.
* 🚫 **Non-Medical** → the system informs the user the content is not a health claim and stops.

---

## 🔍 Retrieval-Grounded Verification

Rather than a generic similarity search, Non-Reliable claims trigger a **retrieval-augmented generation (RAG)** process designed specifically to prevent hallucinated sources:

1. The system builds targeted search queries from the claim's keywords.
2. **DuckDuckGo Search** retrieves real, current web results (including health-authority and platform-specific queries).
3. Results are filtered and ranked by keyword overlap and trusted-domain preference.
4. The LLM (Cerebras primary, Groq fallback) generates a Somali-language explanation, but may only reference sources from the retrieved list — any reference that doesn't correspond to a real retrieved URL is discarded before reaching the user.
5. If retrieval or the LLM call fails, the system falls back to a curated list of verified trusted health resources.

This ensures guidance shown to users is grounded in verifiable content, never fabricated by the language model.

---

## 👩‍⚕️ Healthcare Advisor Review

Every claim classified as Non-Reliable is automatically placed into a review queue. A human **Healthcare Advisor** can:

* Review the submitted claim and the automated classification.
* **Confirm** the Non-Reliable result, or
* **Correct** it, updating the original user's prediction record.

This provides a human safeguard beyond fully automated classification, particularly important given the acknowledged difficulty of Somali-language NLP as a low-resource setting.

---

## 🏗️ System Architecture

```text
┌─────────────────────────┐
│       User Input         │
│  (Text / Audio / Video)  │
└────────────┬─────────────┘
             ▼
┌─────────────────────────┐
│  Speech Transcription    │  (audio/video only)
└────────────┬─────────────┘
             ▼
┌─────────────────────────┐
│   LLM Gatekeeper          │
│ Medical or Non-Medical?  │
└────────────┬─────────────┘
      ┌──────┴──────┐
   Medical      Non-Medical
      ▼             ▼
┌──────────────┐  ┌──────────────┐
│  SomBERTb     │  │ Inform User  │
│   Model       │  │ & Stop       │
└──────┬────────┘  └──────────────┘
       ▼
┌─────────────────────────┐
│   Reliable / Non-Reliable │
└────────────┬─────────────┘
      ┌──────┴──────┐
  Reliable      Non-Reliable
      ▼             ▼
┌───────────┐  ┌─────────────────────┐
│ LLM confirms│ │ DuckDuckGo Retrieval │
│  message    │ │  + LLM (grounded)    │
└─────┬───────┘ └──────────┬───────────┘
      │                    ▼
      │         ┌─────────────────────┐
      │         │ Healthcare Advisor    │
      │         │ Review Queue          │
      │         └──────────┬───────────┘
      └──────────┬──────────┘
                 ▼
         ┌───────────────┐
         │  Final Result   │
         └───────────────┘
```

---

## 💻 Technologies Used

### 🤖 Artificial Intelligence
* SomBERTb, SomBERTa (fine-tuned Somali Transformers)
* Cerebras (`gpt-oss-120b`) / Groq (`llama-3.3-70b-versatile`) — LLM inference
* Hugging Face Transformers

### 🧠 Natural Language Processing
* Somali Language Processing
* Text Classification, Tokenization
* Retrieval-Augmented Generation (RAG)

### 🐍 Machine Learning & Backend
* Python
* PyTorch
* Scikit-learn
* Flask
* PostgreSQL
* JWT Authentication (Flask-JWT-Extended)
* DuckDuckGo Search
* Pandas, Matplotlib, Seaborn

### 🌐 Frontend
* Next.js
* TypeScript
* Tailwind CSS

---

## 📂 Project Structure

```text
project-root/
│
├── Backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── requirements.txt
│   ├── routes/
│   ├── controllers/
│   ├── services/          # predictor, explanation, transcription, review
│   ├── models/             # User, Prediction, Review
│   └── ml_models/          # local assets (SomBERTb hosted on Hugging Face Hub)
│
├── frontend/                # Next.js application
│
├── README.md
└── LICENSE
```

---

## 🚀 System Prediction Flow

**Step 1 — User Input:** Somali health-related claim

**Step 2 — LLM Gatekeeper:** `Medical`

**Step 3 — SomBERTb Prediction:** `Reliable`

**Step 4 — Final Result:**
```json
{
  "claim_type": "Medical",
  "prediction": "Reliable",
  "confidence": 0.97,
  "message": "..."
}
```

---

## 🌍 Why This Project Matters

Health misinformation can negatively affect individuals and communities by spreading inaccurate medical advice. This project focuses on the **Somali language**, where NLP resources and health misinformation detection tools are extremely limited, contributing to:

* Somali-language Artificial Intelligence research
* Health misinformation awareness
* Retrieval-grounded, trustworthy AI-generated health guidance
* Human-in-the-loop verification for AI health tools

---

## 🚧 Future Improvements

* [ ] Expand the Somali health misinformation dataset with more diverse sources.
* [ ] Introduce multiple independent annotators to reduce labeling bias.
* [ ] Extend binary classification with health-topic categories (Medication, Prevention, Lifestyle, Mental Health).
* [ ] Improve automatic Somali speech transcription accuracy.
* [ ] Extend retrieval coverage to platforms such as TikTok and Instagram.
* [ ] Reduce dependency on external LLM providers via local model deployment.
* [ ] Conduct real-world testing with Somali-speaking users.
* [ ] Extend the approach to other low-resource Horn of Africa languages.

---

## 👨‍💻 Author

**Abdirahman Ahmed Abdullahi (Kooshin)**

Computer Science Graduate | Software Engineer & AI/ML Engineer

* GitHub: **[@a4koshin](https://github.com/a4koshin)**
* Portfolio: **[Abdirahman Kooshin](https://abdirahmankooshinn.vercel.app/)**

---

## ⚠️ Disclaimer

This system is intended as a decision-support tool to help users evaluate the reliability of Somali-language health claims. It does **not** provide medical diagnoses or treatment recommendations, and does not replace professional medical advice or verification by a qualified healthcare provider.

---

## ⭐ Support

If you find this project useful, please consider giving the repository a **star ⭐**.

Your support helps encourage the development of **Somali-language Artificial Intelligence and Natural Language Processing solutions**.
