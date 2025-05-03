import enum

class AppointmentStatus(enum.Enum):
    WAITING = "未應診"
    VISITED = "已到診"
    MISSING = "失蹤人口"
    RESCHEDULED = "已改期"
    FOLLOW_UP = "預約覆診" 