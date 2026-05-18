-- src\extra-tables.sql (i added them in the db)
-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: HR_LATE_APPLICATION
-- Employee submits when they arrive late — supervisor approves/rejects
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE HCM.HR_LATE_APPLICATION
(
  LATE_ID          NUMBER                        NOT NULL,
  PERSON_ID        NUMBER                        NOT NULL,  -- FK → HR_EMPLOYEE.PERSON_ID
  LATE_DATE        DATE                          NOT NULL,
  ACTUAL_IN_TIME   TIMESTAMP(6),                            -- when they actually arrived
  REASON           VARCHAR2(2000 BYTE),
  STATUS           VARCHAR2(20 BYTE)             DEFAULT 'PENDING' NOT NULL,
                                                             -- PENDING / APPROVED / REJECTED
  APPROVER_ID      NUMBER,                                  -- FK → HR_EMPLOYEE.PERSON_ID
  APPROVED_ON      TIMESTAMP(6),
  CREATED_BY       NUMBER,
  CREATED_DATE     DATE                          DEFAULT SYSDATE,
  UPDATED_BY       NUMBER,
  UPDATED_DATE     DATE
)
TABLESPACE HCM_DATA
NOCOMPRESS;

-- Primary Key
ALTER TABLE HCM.HR_LATE_APPLICATION ADD (
  CONSTRAINT HR_LATE_APP_PK
  PRIMARY KEY (LATE_ID)
  ENABLE VALIDATE
);

-- Sequence for PK
CREATE SEQUENCE HCM.HR_LATE_APPLICATION_SEQ
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

-- Auto-increment trigger
CREATE OR REPLACE TRIGGER HCM.HR_LATE_APPLICATION_TRG
  BEFORE INSERT ON HCM.HR_LATE_APPLICATION
  FOR EACH ROW
BEGIN
  IF :NEW.LATE_ID IS NULL THEN
    SELECT HCM.HR_LATE_APPLICATION_SEQ.NEXTVAL INTO :NEW.LATE_ID FROM DUAL;
  END IF;
END;
/


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: HR_ATTENDANCE_CORRECTION
-- Employee requests correction of wrong/missing attendance record
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE HCM.HR_ATTENDANCE_CORRECTION
(
  CORRECTION_ID        NUMBER                    NOT NULL,
  PERSON_ID            NUMBER                    NOT NULL,  -- FK → HR_EMPLOYEE.PERSON_ID
  CORRECTION_DATE      DATE                      NOT NULL,  -- which date to correct
  REQUESTED_IN_TIME    TIMESTAMP(6),                        -- what in-time should be
  REQUESTED_OUT_TIME   TIMESTAMP(6),                        -- what out-time should be
  REASON               VARCHAR2(2000 BYTE),
  STATUS               VARCHAR2(20 BYTE)         DEFAULT 'PENDING' NOT NULL,
                                                             -- PENDING / APPROVED / REJECTED
  APPROVER_ID          NUMBER,                              -- FK → HR_EMPLOYEE.PERSON_ID
  APPROVED_ON          TIMESTAMP(6),
  CREATED_BY           NUMBER,
  CREATED_DATE         DATE                      DEFAULT SYSDATE,
  UPDATED_BY           NUMBER,
  UPDATED_DATE         DATE
)
TABLESPACE HCM_DATA
NOCOMPRESS;

-- Primary Key
ALTER TABLE HCM.HR_ATTENDANCE_CORRECTION ADD (
  CONSTRAINT HR_ATT_CORRECTION_PK
  PRIMARY KEY (CORRECTION_ID)
  ENABLE VALIDATE
);

-- Sequence for PK
CREATE SEQUENCE HCM.HR_ATT_CORRECTION_SEQ
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

-- Auto-increment trigger
CREATE OR REPLACE TRIGGER HCM.HR_ATT_CORRECTION_TRG
  BEFORE INSERT ON HCM.HR_ATTENDANCE_CORRECTION
  FOR EACH ROW
BEGIN
  IF :NEW.CORRECTION_ID IS NULL THEN
    SELECT HCM.HR_ATT_CORRECTION_SEQ.NEXTVAL INTO :NEW.CORRECTION_ID FROM DUAL;
  END IF;
END;
/


-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER: HR_EMPLOYEE_NOTIFICATION
-- Add LATE_ID and CORRECTION_ID so notifications can be linked back to
-- the specific request — same pattern as existing LEAVE_ID column.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE HCM.HR_EMPLOYEE_NOTIFICATION
  ADD LATE_ID        NUMBER DEFAULT NULL,  -- FK → HR_LATE_APPLICATION.LATE_ID
  ADD CORRECTION_ID  NUMBER DEFAULT NULL;  -- FK → HR_ATTENDANCE_CORRECTION.CORRECTION_ID