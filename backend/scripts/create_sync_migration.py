#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
生成同步資料庫結構的遷移腳本 - 清理後使用
"""

import os
import sys
import logging
import argparse
import datetime
import uuid

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MIGRATION_TEMPLATE = """\"\"\"資料庫清理後的結構同步遷移

Revision ID: {revision_id}
Revises: {parent_revision}
Create Date: {timestamp}

\"\"\"
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '{revision_id}'
down_revision: Union[str, None] = '{parent_revision}'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    \"\"\"系統已通過自訂腳本清理資料庫，保留了 doctors 和 appointments 表。
    此遷移僅確保這些表存在需要的欄位。\"\"\"
    # 確保 appointments 表有 referral_source 和 referral_notes 欄位
    try:
        op.execute("SELECT referral_source FROM appointments LIMIT 1")
    except Exception:
        op.add_column('appointments', sa.Column('referral_source', sa.String(), nullable=True))
        op.execute("UPDATE appointments SET referral_source = NULL")
    
    try:
        op.execute("SELECT referral_notes FROM appointments LIMIT 1")
    except Exception:
        op.add_column('appointments', sa.Column('referral_notes', sa.Text(), nullable=True))
        op.execute("UPDATE appointments SET referral_notes = NULL")
    
    # 刪除所有不需要的表格的外鍵約束（如果有）
    op.execute(\"\"\"
    DO $$ 
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT conname, conrelid::regclass AS table_name
            FROM pg_constraint
            WHERE contype = 'f'
            AND conrelid::regclass::text IN ('appointments', 'doctors')
            AND confrelid::regclass::text NOT IN ('appointments', 'doctors')
        ) LOOP
            EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.conname;
        END LOOP;
    END $$;
    \"\"\")


def downgrade() -> None:
    \"\"\"此遷移不提供降級操作，因為它只是同步當前已清理的資料庫狀態。\"\"\"
    pass
"""

def get_migrations_dir():
    """獲取遷移文件目錄路徑"""
    try:
        # 嘗試找到 alembic 遷移目錄
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        migrations_dir = os.path.join(base_dir, "migrations", "versions")
        
        if os.path.exists(migrations_dir):
            return migrations_dir
        
        migrations_dir = os.path.join(base_dir, "alembic", "versions")
        
        if os.path.exists(migrations_dir):
            return migrations_dir
        
        logger.error("找不到 migrations 或 alembic 目錄")
        return None
    except Exception as e:
        logger.error(f"獲取遷移目錄時出錯: {str(e)}")
        return None

def main():
    """主函數"""
    parser = argparse.ArgumentParser(description='創建資料庫結構同步遷移文件')
    parser.add_argument('--parent', help='父遷移版本號（不指定則使用新生成的ID）')
    
    args = parser.parse_args()
    
    try:
        # 獲取遷移目錄
        migrations_dir = get_migrations_dir()
        if not migrations_dir:
            sys.exit(1)
        
        # 生成遷移ID和時間戳
        revision_id = str(uuid.uuid4()).replace('-', '')[:12]
        parent_revision = args.parent or revision_id  # 如果沒有指定父版本，使用自身ID
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        
        # 生成遷移文件內容
        migration_content = MIGRATION_TEMPLATE.format(
            revision_id=revision_id,
            parent_revision=parent_revision,
            timestamp=timestamp
        )
        
        # 寫入遷移文件
        filename = f"{revision_id}_sync_after_db_cleanup.py"
        file_path = os.path.join(migrations_dir, filename)
        
        with open(file_path, 'w') as f:
            f.write(migration_content)
        
        logger.info(f"已創建同步遷移文件: {file_path}")
        logger.info(f"遷移版本ID: {revision_id}")
        logger.info(f"父遷移版本ID: {parent_revision}")
        
        # 提示下一步操作
        logger.info("\n下一步操作:")
        logger.info(f"1. 運行 python scripts/reset_alembic_version.py --version={revision_id}")
        logger.info("2. 檢查數據庫結構: python scripts/check_database_structure.py")
        
    except Exception as e:
        logger.error(f"創建遷移文件時出錯: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 