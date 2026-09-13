from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChatMessage, User
from app.auth_utils import get_bearer_user
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageBody(BaseModel):
    text: str

@router.get("")
def get_chat_messages(db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).order_by(ChatMessage.createdAt.desc()).limit(50).all()
    return {
        "messages": [
            {
                "id": m.id,
                "username": m.username,
                "text": m.text,
                "avatarColor": m.avatarColor,
                "createdAt": m.createdAt.isoformat()
            }
            for m in reversed(msgs)
        ]
    }

@router.post("")
def post_chat_message(
    body: ChatMessageBody,
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    msg = ChatMessage(
        username=user.username,
        text=body.text,
        avatarColor=user.avatarColor or "#7c3aed",
        createdAt=datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return {
        "message": {
            "id": msg.id,
            "username": msg.username,
            "text": msg.text,
            "avatarColor": msg.avatarColor,
            "createdAt": msg.createdAt.isoformat()
        }
    }
