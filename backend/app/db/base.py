# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base
from app.models.appointment import Appointment
from app.models.appointment_tag import AppointmentTag
from app.models.doctor import Doctor
from app.models.herb import Herb, Inventory
from app.models.medical_record import MedicalRecord
from app.models.membership import Membership
from app.models.membership_account import MembershipAccountBalance, MembershipAccountLog
from app.models.patient import Patient
from app.models.setting import TcmSetting
from app.models.tag_type import TagType
from app.models.waiting_list import WaitingList 