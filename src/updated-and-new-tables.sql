-- ─────────────────────────────────────────────────────────────────────────────
-- HRMS Schema Changes
-- Based on SLC & PQC Requirements
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. HR_LOCATION
-- Add: daily allowance, GPS coordinates for fake attendance detection
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_LOCATION
  ADD DAILY_ALLOWANCE_AMOUNT  NUMBER(18,2)  DEFAULT 0,
  ADD LATITUDE                NUMBER,
  ADD LONGITUDE               NUMBER,
  ADD RADIUS_METERS           NUMBER        DEFAULT 100;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HR_POSITION
-- Add: overtime rate per hour (position-based)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_POSITION
  ADD OVERTIME_RATE_PER_HOUR  NUMBER(18,2)  DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HR_SHIFT
-- Add: overtime config, break deduction, tiffin & dinner allowance thresholds
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_SHIFT
  ADD OVERTIME_ENABLED          NUMBER(1)      DEFAULT 0,         -- 0=No, 1=Yes
  ADD BREAK_DEDUCTION_MINUTES   NUMBER         DEFAULT 0,         -- e.g. 30, 45, or 0
  ADD TIFFIN_ENABLED            NUMBER(1)      DEFAULT 0,         -- 0=No, 1=Yes
  ADD TIFFIN_THRESHOLD_TIME     VARCHAR2(10),                     -- e.g. '18:00'
  ADD TIFFIN_AMOUNT             NUMBER(18,2)   DEFAULT 0,
  ADD DINNER_ENABLED            NUMBER(1)      DEFAULT 0,         -- 0=No, 1=Yes
  ADD DINNER_THRESHOLD_TIME     VARCHAR2(10),                     -- e.g. '23:00'
  ADD DINNER_AMOUNT             NUMBER(18,2)   DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HR_ATTENDANCE
-- Add: location tracking, fake flag, late minutes, break, tiffin & dinner
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_ATTENDANCE
  ADD LOCATION_ID     NUMBER,                                     -- FK → HR_LOCATION.ID
  ADD IS_FAKE         VARCHAR2(1)   DEFAULT 'N',                  -- Y=Fake/Bad, N=Valid
  ADD LATE_MINUTES    NUMBER        DEFAULT 0,                    -- minutes late from shift start
  ADD BREAK_MINUTES   NUMBER        DEFAULT 0,                    -- break deducted from overtime
  ADD TIFFIN_AMOUNT   NUMBER(18,2)  DEFAULT 0,                    -- tiffin allowance earned
  ADD DINNER_AMOUNT   NUMBER(18,2)  DEFAULT 0;                    -- dinner allowance earned


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ATT_LOG
-- Add: fake flag at raw punch level
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.ATT_LOG
  ADD IS_FAKE  VARCHAR2(1)  DEFAULT 'N';                          -- Y=GPS mismatch, N=Valid


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. HR_LEAVE_REQUEST
-- Add: 2-level approval support (Level 1 = Supervisor, Final = Admin)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_LEAVE_REQUEST
  ADD LEVEL1_APPROVER_ID   NUMBER,                                -- FK → HR_EMPLOYEE.PERSON_ID
  ADD LEVEL1_APPROVED_ON   TIMESTAMP(6),
  ADD LEVEL1_STATUS        VARCHAR2(20)  DEFAULT 'PENDING';       -- PENDING / APPROVED / REJECTED


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HR_LATE_APPLICATION
-- Add: 2-level approval support (Level 1 = Supervisor, Final = Admin)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_LATE_APPLICATION
  ADD LEVEL1_APPROVER_ID   NUMBER,                                -- FK → HR_EMPLOYEE.PERSON_ID
  ADD LEVEL1_APPROVED_ON   TIMESTAMP(6),
  ADD LEVEL1_STATUS        VARCHAR2(20)  DEFAULT 'PENDING';       -- PENDING / APPROVED / REJECTED


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. HR_LOAN
-- Add: approval workflow columns
-- Note: existing STATUS column already exists — extend values to include
--       PENDING / APPROVED / REJECTED (was only ACTIVE before)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_LOAN
  ADD APPROVER_ID       NUMBER,                                   -- FK → HR_EMPLOYEE.PERSON_ID
  ADD APPROVED_ON       TIMESTAMP(6),
  ADD REJECTION_REASON  VARCHAR2(2000);

-- Update default STATUS to PENDING for new loan requests
ALTER TABLE HCM.HR_LOAN
  MODIFY STATUS  VARCHAR2(30)  DEFAULT 'PENDING';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. HR_EMPLOYEE_NOTIFICATION
-- Add: LEAVE_ID (if not already applied), notification type, read tracking
-- Note: LATE_ID and CORRECTION_ID already added via extra-tables.sql
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_EMPLOYEE_NOTIFICATION
  ADD LEAVE_ID            NUMBER        DEFAULT NULL,             -- FK → HR_LEAVE_REQUEST.LEAVE_ID
  ADD NOTIFICATION_TYPE   VARCHAR2(50),                           -- LEAVE / LATE / CORRECTION / LOAN
  ADD IS_READ             VARCHAR2(1)   DEFAULT 'N';              -- Y=Read, N=Unread


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. HR_PAY_COMPONENT
-- Add: category to distinguish auto-calculated special components
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE HCM.HR_PAY_COMPONENT
  ADD COMPONENT_CATEGORY  VARCHAR2(50);
  -- Values: BASIC / OVERTIME / LOCATION_ALLOWANCE / TIFFIN / DINNER / LATE_PENALTY / TAX / LOAN_DEDUCTION


-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: HR_LATE_PENALTY_RULE
-- Stores the business rule: every N lates = M days salary deduction
-- Enforced automatically during payroll run
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE HCM.HR_LATE_PENALTY_RULE
(
  RULE_ID                NUMBER          NOT NULL,
  CONSECUTIVE_LATE_COUNT NUMBER          NOT NULL,                -- e.g. 3
  DEDUCTION_DAYS         NUMBER          NOT NULL,                -- e.g. 1
  EFFECTIVE_DATE         DATE            NOT NULL,
  STATUS                 VARCHAR2(10)    DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE / INACTIVE
  CREATED_BY             NUMBER,
  CREATED_DATE           DATE            DEFAULT SYSDATE,
  UPDATED_BY             NUMBER,
  UPDATED_DATE           DATE
)
TABLESPACE HCM_DATA
NOCOMPRESS;

-- Primary Key
ALTER TABLE HCM.HR_LATE_PENALTY_RULE ADD (
  CONSTRAINT HR_LATE_PENALTY_RULE_PK
  PRIMARY KEY (RULE_ID)
  ENABLE VALIDATE
);

-- Sequence
CREATE SEQUENCE HCM.HR_LATE_PENALTY_RULE_SEQ
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

-- Auto-increment trigger
CREATE OR REPLACE TRIGGER HCM.HR_LATE_PENALTY_RULE_TRG
  BEFORE INSERT ON HCM.HR_LATE_PENALTY_RULE
  FOR EACH ROW
BEGIN
  IF :NEW.RULE_ID IS NULL THEN
    SELECT HCM.HR_LATE_PENALTY_RULE_SEQ.NEXTVAL INTO :NEW.RULE_ID FROM DUAL;
  END IF;
END;
/




-- ─────────────────────────────────────────────────────────────────────────────
-- TODO (Future Enhancement): Position-Based Location Allowance
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Currently location allowance is a flat rate per location stored in:
--   HR_LOCATION.DAILY_ALLOWANCE_AMOUNT
--
-- If in the future different positions need different allowance amounts
-- at the same location (e.g. Executive at Gazipur = 700/day vs General = 500/day):
--
--   STEP 1: Create HR_LOCATION_ALLOWANCE table
--           LOCATION_ALLOWANCE_ID  NUMBER        PK
--           LOCATION_ID            NUMBER        FK → HR_LOCATION
--           POSITION_ID            NUMBER        FK → HR_POSITION (NULL = applies to all)
--           DAILY_ALLOWANCE_AMOUNT NUMBER(18,2)
--           EFFECTIVE_DATE         DATE
--           STATUS                 VARCHAR2(10)  ACTIVE / INACTIVE
--
--   STEP 2: In payroll calculation, lookup HR_LOCATION_ALLOWANCE first.
--           If a position-specific row exists → use it.
--           Else fall back to HR_LOCATION.DAILY_ALLOWANCE_AMOUNT (flat rate).
--
--   STEP 3: Once fully migrated, deprecate HR_LOCATION.DAILY_ALLOWANCE_AMOUNT.
--
-- ─────────────────────────────────────────────────────────────────────────────