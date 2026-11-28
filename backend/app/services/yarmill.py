"""
Minimal client for the ČSPS Yarmill API, reverse-engineered from observed
web-app traffic (see Yarmill.md). The bearer token is provided per request
and never persisted.

NOTE: the value key in the attendance payload ("Value") is a guess —
Yarmill.md documents only ActivityItemID/UserID/Date. Confirm against a real
browser request before first use.
"""

import os
import time
from datetime import date

import requests

from app.constants import (
    YarmillActivityItem,
    YarmillAttendanceItem,
    YarmillAttendanceValue,
    YarmillAttributeId,
    YarmillState,
)

_REQUEST_TIMEOUT = 15
_INTER_REQUEST_DELAY = 0.15

_ENDPOINT_ATTENDANCE_SAVE = "/attendance/save/user"
_ENDPOINT_TRAINING_DAY_ACTIVITY = "/TrainingDayActivity"
_ENDPOINT_TRAINING_DAY_ATTRIBUTE = "/TrainingDayAttribute"
_ENDPOINT_PLAN_COPY_GROUP_TO_USERS = "/Plan/Week/Copy/GroupToUsers"
_ENDPOINT_ATTENDANCE_COPY_TO_REALITY = "/attendance/copy/UserPlanToReality"

TOKEN_EXPIRED_MESSAGE = "Yarmill token vypršel — vlož nový token."


class YarmillError(Exception):
    """Upstream Yarmill failure carrying a user-presentable Czech message."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _yarmill_date(day: date) -> str:
    return f"{day.isoformat()}T00:00:00"


def _validate_target(user_group_id: int | None, user_id: int | None) -> None:
    if (user_group_id is None) == (user_id is None):
        raise ValueError(
            "Yarmill zápis vyžaduje právě jedno z user_group_id / user_id "
            "(group-wide = userId null, per-swimmer = userGroupId null)."
        )


class YarmillClient:
    """Thin wrapper over the four observed Yarmill endpoints."""

    def __init__(self, token: str):
        base_url = os.getenv("YARMILL_API_BASE")
        if not base_url:
            raise YarmillError("YARMILL_API_BASE není nastaven.")
        if not token or not token.strip():
            raise YarmillError("Chybí Yarmill token.")
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Content-Type": "application/json",
        }

    def save_user_attendance(
        self,
        yarmill_user_id: int,
        item: YarmillAttendanceItem,
        day: date,
        value: YarmillAttendanceValue,
    ) -> None:
        self._post(
            _ENDPOINT_ATTENDANCE_SAVE,
            {
                "ActivityItemID": int(item),
                "Value": int(value),
                "UserID": yarmill_user_id,
                "Date": _yarmill_date(day),
            },
        )

    def save_training_day_activity(
        self,
        item: YarmillActivityItem,
        day: date,
        value: int | float,
        *,
        user_group_id: int | None = None,
        user_id: int | None = None,
    ) -> None:
        """One plan cell per call; exactly one of user_group_id / user_id."""
        _validate_target(user_group_id, user_id)
        self._post(
            _ENDPOINT_TRAINING_DAY_ACTIVITY,
            {
                "activityItemId": int(item),
                "day": _yarmill_date(day),
                "state": YarmillState.PLAN.value,
                "userGroupId": user_group_id,
                "userId": user_id,
                "value": value,
            },
        )

    def save_training_day_attribute(
        self,
        attribute_id: YarmillAttributeId,
        day: date,
        value_html: str,
        *,
        user_group_id: int | None = None,
        user_id: int | None = None,
    ) -> None:
        _validate_target(user_group_id, user_id)
        self._post(
            _ENDPOINT_TRAINING_DAY_ATTRIBUTE,
            {
                "attributeId": int(attribute_id),
                "state": YarmillState.PLAN.value,
                "value": value_html,
                "date": _yarmill_date(day),
                "userGroupId": user_group_id,
                "userId": user_id,
            },
        )

    def copy_group_plan_to_users(
        self,
        days: list[date],
        target_user_ids: list[int],
        source_user_group_id: int,
    ) -> None:
        """Before this call the filled grid is NOT visible to the swimmers."""
        self._post(
            _ENDPOINT_PLAN_COPY_GROUP_TO_USERS,
            {
                "Days": [_yarmill_date(d) for d in days],
                "IncludeWeekGoal": True,
                "TargetUserIds": target_user_ids,
                "SourceUserGroupId": source_user_group_id,
                "ConflictResolution": "FullOverwrite",
            },
        )

    def copy_attendance_to_reality(
        self,
        user_group_id: int,
        start: date,
        end: date,
    ) -> None:
        """Saved attendance is a semi-state until copied to Reality."""
        self._post(
            _ENDPOINT_ATTENDANCE_COPY_TO_REALITY,
            {
                "UserGroupId": user_group_id,
                "StartDate": _yarmill_date(start),
                "EndDate": f"{end.isoformat()}T23:59:59",
                "ConflictResolution": "FullOverwrite",
            },
        )

    def _post(self, path: str, payload: dict) -> None:
        url = f"{self._base_url}{path}"
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers,
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise YarmillError(
                "Yarmill je nedostupný — zkontroluj připojení a zkus to znovu."
            ) from exc

        if response.status_code == 401:
            raise YarmillError(TOKEN_EXPIRED_MESSAGE, status_code=401)
        if not response.ok:
            raise YarmillError(
                f"Yarmill odmítl požadavek (HTTP {response.status_code}).",
                status_code=response.status_code,
            )

        time.sleep(_INTER_REQUEST_DELAY)
