from sqlalchemy import Column, Integer, String, Text
from app.db.database import Base


class BreedMetadata(Base):
    __tablename__ = "breed_metadata"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(120), unique=True, nullable=False, index=True)
    description  = Column(Text)
    temperament  = Column(String(300))
    size         = Column(String(50))    # Small / Medium / Large / Giant
    origin       = Column(String(100))
    lifespan     = Column(String(50))
    energy_level = Column(String(50))   # Low / Medium / High
    shedding     = Column(String(50))   # Low / Medium / Heavy
    fun_fact     = Column(Text)
