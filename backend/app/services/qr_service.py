"""
QR Code generation and management service.
"""
import qrcode
from io import BytesIO
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models import QRAnchor, Node, FloorPlan


class QRCodeService:
    """Service for generating and managing QR codes."""

    @staticmethod
    def generate_qr_code(data: str, size: int = 300) -> BytesIO:
        """
        Generate a QR code image.

        Args:
            data: Data to encode in QR code
            size: Size of QR code in pixels

        Returns:
            BytesIO object containing PNG image
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Resize to desired size
        img = img.resize((size, size))

        # Save to BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return buffer

    @staticmethod
    def generate_qr_data(base_url: str, qr_code: str) -> str:
        """
        Generate QR code data URL.

        Args:
            base_url: Base URL for the application
            qr_code: QR anchor code

        Returns:
            Full URL to encode in QR
        """
        return f"{base_url}/navigate?qr={qr_code}"

    @staticmethod
    def get_location_from_qr(db: Session, qr_code: str) -> Optional[dict]:
        """
        Get location information from QR code.

        Args:
            db: Database session
            qr_code: QR anchor code

        Returns:
            Dictionary with floor plan and location info, or None if not found
        """
        # Find QR anchor
        anchor = db.query(QRAnchor).filter(
            QRAnchor.code == qr_code,
            QRAnchor.active == True
        ).first()

        if not anchor:
            return None

        # Increment scan count
        anchor.scan_count += 1
        db.commit()

        # Get associated node and floor plan
        node = db.query(Node).filter(Node.id == anchor.node_id).first()
        floor_plan = db.query(FloorPlan).filter(FloorPlan.id == anchor.floor_plan_id).first()

        if not node or not floor_plan:
            return None

        return {
            "floor_plan": floor_plan,
            "node": node,
            "anchor": anchor
        }
