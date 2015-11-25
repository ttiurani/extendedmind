package org.extendedmind

// List of all error codes

sealed abstract class ErrorCode(val number : Int)
case object ERR_BASE_UNKNOWN extends ErrorCode(1)
case object ERR_BASE_INTERNAL_UNKNOWN extends ErrorCode(2)
case object ERR_BASE_UPDATE_NODE extends ErrorCode(3)
case object ERR_BASE_CONVERT_NODE extends ErrorCode(4)
case object ERR_BASE_NODE_LABEL_NOT_FOUND extends ErrorCode(5)
case object ERR_BASE_NODE_LABEL_MORE_THAN_1 extends ErrorCode(6)
case object ERR_BASE_NODE_LABEL_DELETED extends ErrorCode(7)
case object ERR_BASE_NODE_REL_MORE_THAN_1 extends ErrorCode(8)
case object ERR_BASE_EMAIL_EXISTS extends ErrorCode(9)
case object ERR_BASE_TOKEN_NOT_FOUND extends ErrorCode(10)
case object ERR_BASE_TOKEN_EXPIRED extends ErrorCode(11)
case object ERR_BASE_TOKEN_MISSING_EXPIRED extends ErrorCode(12)
case object ERR_BASE_TOKEN_NO_LONGER_REPLACEABLE extends ErrorCode(13)
case object ERR_BASE_TOKEN_NOT_REPLACEABLE extends ErrorCode(14)
case object ERR_BASE_INVALID_PASSWORD extends ErrorCode(15)
case object ERR_BASE_NO_ACCESS extends ErrorCode(16)
case object ERR_BASE_PASSWORD_NOT_RESETABLE extends ErrorCode(17)
case object ERR_BASE_PASSWORD_NOT_RESETABLE_ANYMORE extends ErrorCode(18)
case object ERR_BASE_PASSWORD_INVALID_VERIFICATION_CODE extends ErrorCode(19)
case object ERR_BASE_PASSWORD_NOT_VERIFIABLE extends ErrorCode(20)
case object ERR_BASE_INVALID_TOKEN_LENGTH extends ErrorCode(21)
case object ERR_BASE_INVALID_CRC extends ErrorCode(22)
case object ERR_BASE_DECRYPT_FAILED extends ErrorCode(23)
case object ERR_BASE_ALREADY_LOGGED_IN extends ErrorCode(24)
case object ERR_BASE_AUTHENTICATION_FAILED extends ErrorCode(25)
case object ERR_BASE_OWNER_NOT_IN_SECURITY_CONTEXT extends ErrorCode(26)
case object ERR_BASE_NO_LIST_ACCESS extends ErrorCode(27)
case object ERR_BASE_FOUNDER_ACCESS_RIGHT_REQUIRED extends ErrorCode(28)
case object ERR_BASE_WRONG_EXPECTED_MODIFIED extends ErrorCode(29)
case object ERR_BASE_HANDLE_EXISTS extends ErrorCode(30)
case object ERR_BASE_INFO_MORE_THAN_1 extends ErrorCode(31)

case object ERR_COLLECTIVE_NO_FOUNDER extends ErrorCode(1001)
case object ERR_COLLECTIVE_MORE_THAN_1_FOUNDER extends ErrorCode(1002)
case object ERR_COLLECTIVE_WRONG_FOUNDER extends ErrorCode(1003)
case object ERR_COLLECTIVE_NO_ACCESS extends ErrorCode(1004)

case object ERR_INVITE_DELETE_ACCEPTED extends ErrorCode(2001)
case object ERR_INVITE_NOT_FOUND extends ErrorCode(2002)
case object ERR_INVITE_MORE_THAN_1 extends ErrorCode(2003)
case object ERR_INVITE_NOT_FOUND_EMAIL extends ErrorCode(2004)
case object ERR_INVITE_NOT_FOUND_UUID extends ErrorCode(2005)
case object ERR_INVITE_DESTROY_ACCEPTED extends ErrorCode(2006)
case object ERR_INVITE_REL_ACCEPTED extends ErrorCode(2007)
case object ERR_INVITE_REL_ORIGIN extends ErrorCode(2008)

case object ERR_ITEM_TO_NOTE extends ErrorCode(3001)
case object ERR_ITEM_TO_TASK extends ErrorCode(3002)
case object ERR_ITEM_TO_LIST extends ErrorCode(3003)
case object ERR_ITEM_TO_TAG extends ErrorCode(3004)
case object ERR_ITEM_TO_ITEM extends ErrorCode(3005)
case object ERR_ITEM_ALREADY_EXTENDED extends ErrorCode(3006)
case object ERR_ITEM_NOT_FOUND extends ErrorCode(3007)
case object ERR_ITEM_MORE_THAN_1 extends ErrorCode(3008)
case object ERR_ITEM_NO_LABEL extends ErrorCode(3009)
case object ERR_ITEM_DELETED extends ErrorCode(3010)
case object ERR_ITEM_TAG_NO_OWNER extends ErrorCode(3011)
case object ERR_ITEM_TAG_MORE_THAN_1_OWNER extends ErrorCode(3012)
case object ERR_ITEM_TAG_WRONG_OWNER extends ErrorCode(3013)
case object ERR_ITEM_DOES_NOT_HAVE_TAG extends ErrorCode(3014)
case object ERR_ITEM_CONTENT_ALREADY_DESCRIPTION extends ErrorCode(3015)
case object ERR_ITEM_CONTENT_TOO_LONG extends ErrorCode(3016)
case object ERR_ITEM_ARCHIVE_NOT_PREMIUM extends ErrorCode(3017)
case object ERR_ITEM_OWN_PARENT extends ErrorCode(3018)
case object ERR_ITEM_PARENT_INFINITE_LOOP extends ErrorCode(3019)
case object ERR_ITEM_INVALID_PARENT extends ErrorCode(3020)
case object ERR_ITEM_MISSING_SUBJECT extends ErrorCode(3021)
case object ERR_ITEM_NOT_NOTE extends ErrorCode(3022)
case object ERR_ITEM_NOT_ASSIGNABLE extends ErrorCode(3023)
case object ERR_ITEM_ASSIGNEE_NO_ACCESS extends ErrorCode(3024)
case object ERR_ITEM_NO_OWNER extends ErrorCode(3025)

case object ERR_LIST_ARCHIVE_CHILDREN extends ErrorCode(4001)
case object ERR_LIST_MISSING_HISTORY_TAG extends ErrorCode(4002)
case object ERR_LIST_DELETE_CHILDREN extends ErrorCode(4003)
case object ERR_LIST_CONVERT_CHILDREN extends ErrorCode(4004)
case object ERR_LIST_ARCHIVE_NOT_PREMIUM extends ErrorCode(4005)
case object ERR_LIST_ALREADY_ARCHIVED extends ErrorCode(4006)
case object ERR_LIST_UNARCHIVE_CHILDREN extends ErrorCode(4007)
case object ERR_LIST_NOT_ARCHIVED extends ErrorCode(4008)
case object ERR_LIST_MORE_THAN_ONE_ACTIVE_HISTORY extends ErrorCode(4009)
case object ERR_LIST_NO_ACTIVE_HISTORY extends ErrorCode(4010)
case object ERR_LIST_PARENT_NOT_ARCHIVED extends ErrorCode(4011)
case object ERR_LIST_PARENT_ARCHIVED extends ErrorCode(4012)
case object ERR_LIST_DELETE_AGREEMENTS extends ErrorCode(4013)

case object ERR_USER_NO_USERS extends ErrorCode(5001)
case object ERR_USER_ALREADY_EXISTS extends ErrorCode(5002)
case object ERR_USER_MORE_THAN_1_USERS extends ErrorCode(5003)
case object ERR_USER_TOKEN_NO_USERS extends ErrorCode(5004)
case object ERR_USER_TOKEN_MORE_THAN_1_USERS extends ErrorCode(5005)
case object ERR_USER_DELETE_WITH_COLLECTIVES extends ErrorCode(5006)
case object ERR_USER_INVALID_AGREEMENT_USER_UUID extends ErrorCode(5007)
case object ERR_USER_AGREEMENT_ALREADY_EXISTS extends ErrorCode(5008)
case object ERR_USER_INVALID_AGREEMENT_PARTY extends ErrorCode(5009)
case object ERR_USER_INVALID_ACCESS_VALUE extends ErrorCode(5010)
case object ERR_USER_FOUNDER_PERMISSION extends ErrorCode(5011)
case object ERR_USER_CANT_FIND_AGREEMENT_PARTY extends ErrorCode(5012)
case object ERR_USER_DELETE_WITH_PROPOSED_AGREEMENTS extends ErrorCode(5013)
case object ERR_USER_AGREEMENT_ACCEPTED extends ErrorCode(5014)
case object ERR_USER_AGREEMENT_NOT_FOUND extends ErrorCode(5015)
case object ERR_USER_CANT_FIND_AGREEMENT_CONCERNING extends ErrorCode(5016)
case object ERR_USER_INVALID_AGREEMENT extends ErrorCode(5017)
case object ERR_USER_AGREEMENT_TO_SELF extends ErrorCode(5018)
case object ERR_USER_EMAIL_ALREADY_VERIFIED extends ErrorCode(5019)

case object ERR_TASK_INVALID_REMINDER_UUID extends ErrorCode(6001)
case object ERR_TASK_INVALID_REMINDER_ID extends ErrorCode(6002)
case object ERR_TASK_CONVERT_REMINDERS extends ErrorCode(6003)

case object ERR_TAG_UNDELETE_HISTORY extends ErrorCode(7001)

case object ERR_NOTE_NO_HANDLE extends ErrorCode(8001)
case object ERR_NOTE_PATH_IN_USE extends ErrorCode(8002)
case object ERR_NOTE_CONVERT_PUBLISHED extends ErrorCode(8003)


