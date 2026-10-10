import unittest
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.core.security import hash_password
from app.services.date_parser import parse_deadline_date
from app.api.tasks import get_user_tasks, get_user_tasks_stats
from app.api.action_items import update_action_item_status
from app.schemas.action_item import ActionItemUpdate


class TestTasksAndDeadlines(unittest.TestCase):

    def setUp(self):
        # In-memory SQLite for test isolation
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed Users
        self.user1 = User(
            id=1,
            email="user1@example.com",
            password_hash=hash_password("pw1"),
            name="User One",
        )
        self.user2 = User(
            id=2,
            email="user2@example.com",
            password_hash=hash_password("pw2"),
            name="User Two",
        )
        self.db.add_all([self.user1, self.user2])
        self.db.commit()

        # Seed Meetings
        self.meeting1 = Meeting(
            id=1,
            user_id=self.user1.id,
            title="Sprint Planning",
            file_path="meeting1.mp3",
            status="ready",
            created_at=datetime(2026, 10, 11, 10, 0, 0),
        )
        self.meeting2 = Meeting(
            id=2,
            user_id=self.user1.id,
            title="Architecture Review",
            file_path="meeting2.mp3",
            status="ready",
            created_at=datetime(2026, 10, 11, 11, 0, 0),
        )
        self.meeting_other = Meeting(
            id=3,
            user_id=self.user2.id,
            title="Other User Meeting",
            file_path="meeting3.mp3",
            status="ready",
            created_at=datetime(2026, 10, 11, 12, 0, 0),
        )
        self.db.add_all([self.meeting1, self.meeting2, self.meeting_other])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_deadline_parser_clear_cases(self):
        base_dt = datetime(2026, 10, 11, 10, 0, 0)  # Sunday Oct 11, 2026

        # tomorrow -> Oct 12
        self.assertEqual(parse_deadline_date("tomorrow", base_dt), date(2026, 10, 12))
        self.assertEqual(parse_deadline_date("by tomorrow", base_dt), date(2026, 10, 12))

        # Friday -> Oct 16
        self.assertEqual(parse_deadline_date("Friday", base_dt), date(2026, 10, 16))
        self.assertEqual(parse_deadline_date("by Friday", base_dt), date(2026, 10, 16))

        # next Monday -> Oct 12
        self.assertEqual(parse_deadline_date("next Monday", base_dt), date(2026, 10, 12))

        # 15 October -> Oct 15
        self.assertEqual(parse_deadline_date("15 October", base_dt), date(2026, 10, 15))
        self.assertEqual(parse_deadline_date("October 15", base_dt), date(2026, 10, 15))

    def test_deadline_parser_unclear_cases(self):
        base_dt = datetime(2026, 10, 11, 10, 0, 0)

        self.assertIsNone(parse_deadline_date("ASAP", base_dt))
        self.assertIsNone(parse_deadline_date("soon", base_dt))
        self.assertIsNone(parse_deadline_date("tbd", base_dt))
        self.assertIsNone(parse_deadline_date("unclear", base_dt))
        self.assertIsNone(parse_deadline_date("when possible", base_dt))
        self.assertIsNone(parse_deadline_date("next sprint", base_dt))
        self.assertIsNone(parse_deadline_date("1", base_dt))
        self.assertIsNone(parse_deadline_date("eventually", base_dt))
        self.assertIsNone(parse_deadline_date("", base_dt))
        self.assertIsNone(parse_deadline_date(None, base_dt))

    def test_get_tasks_with_user_isolation(self):
        # Action items for User 1
        item1 = ActionItem(
            id=1,
            meeting_id=self.meeting1.id,
            task="Write auth tests",
            assigned_to="Radhika",
            deadline_text="Friday",
            deadline_date=date(2026, 10, 16),
            status="pending",
        )
        item2 = ActionItem(
            id=2,
            meeting_id=self.meeting2.id,
            task="Deploy to prod",
            assigned_to="DevOps",
            deadline_text="ASAP",
            deadline_date=None,
            status="done",
        )
        # Action item for User 2
        item_user2 = ActionItem(
            id=3,
            meeting_id=self.meeting_other.id,
            task="Secret competitor task",
            assigned_to="Bob",
            deadline_text="tomorrow",
            deadline_date=date(2026, 10, 12),
            status="pending",
        )
        self.db.add_all([item1, item2, item_user2])
        self.db.commit()

        # Fetch for User 1
        tasks_u1 = get_user_tasks(
            status="all",
            assignee=None,
            sort="newest",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(len(tasks_u1), 2)
        task_ids = [t.id for t in tasks_u1]
        self.assertIn(1, task_ids)
        self.assertIn(2, task_ids)
        self.assertNotIn(3, task_ids)

        # Verify meeting_title is populated
        self.assertEqual(tasks_u1[0].meeting_title, "Architecture Review")
        self.assertEqual(tasks_u1[1].meeting_title, "Sprint Planning")

        # Fetch for User 2
        tasks_u2 = get_user_tasks(
            status="all",
            assignee=None,
            sort="newest",
            db=self.db,
            current_user=self.user2,
        )
        self.assertEqual(len(tasks_u2), 1)
        self.assertEqual(tasks_u2[0].id, 3)
        self.assertEqual(tasks_u2[0].meeting_title, "Other User Meeting")

    def test_get_tasks_filters_and_sorting(self):
        yesterday = date.today() - timedelta(days=1)
        next_week = date.today() + timedelta(days=7)

        item1 = ActionItem(
            id=10,
            meeting_id=self.meeting1.id,
            task="Task 1",
            assigned_to="Alice",
            deadline_text="yesterday",
            deadline_date=yesterday,
            status="pending",
        )
        item2 = ActionItem(
            id=11,
            meeting_id=self.meeting1.id,
            task="Task 2",
            assigned_to="Bob",
            deadline_text="next week",
            deadline_date=next_week,
            status="done",
        )
        item3 = ActionItem(
            id=12,
            meeting_id=self.meeting2.id,
            task="Task 3",
            assigned_to=None,
            deadline_text=None,
            deadline_date=None,
            status="pending",
        )
        self.db.add_all([item1, item2, item3])
        self.db.commit()

        # Status filter: pending
        pending_tasks = get_user_tasks(
            status="pending",
            assignee=None,
            sort="newest",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(len(pending_tasks), 2)
        self.assertTrue(all(t.status == "pending" for t in pending_tasks))

        # Status filter: done
        done_tasks = get_user_tasks(
            status="done",
            assignee=None,
            sort="newest",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(len(done_tasks), 1)
        self.assertEqual(done_tasks[0].id, 11)

        # Assignee filter: Alice
        alice_tasks = get_user_tasks(
            status="all",
            assignee="Alice",
            sort="newest",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(len(alice_tasks), 1)
        self.assertEqual(alice_tasks[0].assigned_to, "Alice")

        # Assignee filter: unassigned
        unassigned_tasks = get_user_tasks(
            status="all",
            assignee="Unassigned",
            sort="newest",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(len(unassigned_tasks), 1)
        self.assertEqual(unassigned_tasks[0].id, 12)

        # Sort: deadline (items with deadlines first in asc order, then nulls)
        sorted_by_deadline = get_user_tasks(
            status="all",
            assignee=None,
            sort="deadline",
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(sorted_by_deadline[0].id, 10)  # yesterday
        self.assertEqual(sorted_by_deadline[1].id, 11)  # next week
        self.assertEqual(sorted_by_deadline[2].id, 12)  # None deadline

    def test_get_tasks_stats(self):
        yesterday = date.today() - timedelta(days=1)
        tomorrow = date.today() + timedelta(days=1)

        # 3 items for User 1:
        # 1 overdue pending (deadline yesterday)
        # 1 non-overdue pending (deadline tomorrow)
        # 1 done (deadline yesterday - should NOT be counted as overdue because it's done!)
        item1 = ActionItem(
            id=1,
            meeting_id=self.meeting1.id,
            task="Overdue Task",
            deadline_date=yesterday,
            status="pending",
        )
        item2 = ActionItem(
            id=2,
            meeting_id=self.meeting1.id,
            task="Future Task",
            deadline_date=tomorrow,
            status="pending",
        )
        item3 = ActionItem(
            id=3,
            meeting_id=self.meeting2.id,
            task="Completed Task",
            deadline_date=yesterday,
            status="done",
        )
        self.db.add_all([item1, item2, item3])
        self.db.commit()

        stats = get_user_tasks_stats(db=self.db, current_user=self.user1)
        self.assertEqual(stats.total_meetings, 2)
        self.assertEqual(stats.total_action_items, 3)
        self.assertEqual(stats.pending_count, 2)
        self.assertEqual(stats.done_count, 1)
        self.assertEqual(stats.overdue_count, 1)

    def test_patch_action_item_status(self):
        item = ActionItem(
            id=20,
            meeting_id=self.meeting1.id,
            task="Toggle me",
            status="pending",
        )
        self.db.add(item)
        self.db.commit()

        # Update to done
        updated = update_action_item_status(
            action_item_id=20,
            payload=ActionItemUpdate(status="done"),
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(updated.status, "done")

        # Update back to pending
        updated_again = update_action_item_status(
            action_item_id=20,
            payload=ActionItemUpdate(status="pending"),
            db=self.db,
            current_user=self.user1,
        )
        self.assertEqual(updated_again.status, "pending")


if __name__ == "__main__":
    unittest.main()
