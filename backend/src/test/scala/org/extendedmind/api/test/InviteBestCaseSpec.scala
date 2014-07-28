/**
 * Copyright (c) 2013-2014 Extended Mind Technologies Oy
 *
 * This file is part of Extended Mind.
 *
 * Extended Mind is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package org.extendedmind.api.test

import java.io.PrintWriter
import java.util.UUID
import org.extendedmind._
import org.extendedmind.bl._
import org.extendedmind.db._
import org.extendedmind.domain._
import org.extendedmind.security._
import org.extendedmind.email._
import org.extendedmind.test._
import org.extendedmind.test.TestGraphDatabase._
import org.mockito.Mockito._
import org.mockito.Matchers._
import org.mockito.Matchers.{ eq => mockEq }
import scaldi.Module
import spray.http.BasicHttpCredentials
import spray.http.HttpHeaders.Authorization
import org.zeroturnaround.zip.ZipUtil
import java.io.File
import org.zeroturnaround.zip.FileUtil
import org.apache.commons.io.FileUtils
import org.extendedmind.api.JsonImplicits._
import spray.httpx.SprayJsonSupport._
import spray.httpx.marshalling._
import spray.json.DefaultJsonProtocol._
import scala.concurrent.Future

/**
 * Best case test for invites. Also generates .json files.
 */
class InviteBestCaseSpec extends ImpermanentGraphDatabaseSpecBase {

  val mockMailgunClient = mock[MailgunClient]

  object TestDataGeneratorConfiguration extends Module {
    bind[GraphDatabase] to db
    bind[MailgunClient] to mockMailgunClient
  }

  override def configurations = TestDataGeneratorConfiguration :: new Configuration(settings, actorRefFactory)
  
  before {
    db.insertTestData()
  }

  after {
    cleanDb(db.ds.gds)
    reset(mockMailgunClient)
  }

  describe("In the best case, InviteService") {

    it("should successfully create invite requests with POST to /invite/request "
      + "and get them back with GET to /admin/invite/requests "
      + "and get the right order number with GET to /invite/request/[UUID] "
      + "and delete it with DELETE to /admin/invite/request/[UUID] "
      + "and accept the request with POST to /admin/invite/request/[UUID]/accept "
      + "and accept the invite with POST to /invite/[code]/accept ") {
      val testEmail = "example@example.com"
      val testInviteRequest = InviteRequest(None, testEmail, None, None, None)
      val testEmail2 = "example2@example.com"
      val testInviteRequest2 = InviteRequest(None, testEmail2, None, None, None)
      val testEmail3 = "example3@example.com"
      val testInviteRequest3 = InviteRequest(None, testEmail3, None, None, None)

      stub(mockMailgunClient.sendRequestInviteConfirmation(mockEq(testEmail), anyObject())).toReturn(
        Future { SendEmailResponse("OK", "1234") })
      stub(mockMailgunClient.sendRequestInviteConfirmation(mockEq(testEmail2), anyObject())).toReturn(
        Future { SendEmailResponse("OK", "12345") })
      stub(mockMailgunClient.sendRequestInviteConfirmation(mockEq(testEmail3), anyObject())).toReturn(
        Future { SendEmailResponse("OK", "123456") })
      stub(mockMailgunClient.sendInvite(anyObject())).toReturn(
        Future { SendEmailResponse("OK", "1234567") })
      Post("/invite/request",
        marshal(testInviteRequest).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
          writeJsonOutput("inviteRequestResponse", responseAs[String])
          val inviteRequestResponse = responseAs[InviteRequestResult]
          inviteRequestResponse.resultType should be (NEW_INVITE_REQUEST_RESULT)
          inviteRequestResponse.result.get.uuid should not be None
          inviteRequestResponse.result.get.modified should not be None
          inviteRequestResponse.queueNumber.get should be (1)

          Post("/invite/request",
            marshal(testInviteRequest2).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
              val inviteRequestResponse2 = responseAs[InviteRequestResult]
              inviteRequestResponse2.queueNumber.get should be (2)
              Post("/invite/request",
                marshal(testInviteRequest3).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
                  val inviteRequestResponse3 = responseAs[InviteRequestResult]
                  inviteRequestResponse3.queueNumber.get should be (3)

                  verify(mockMailgunClient).sendRequestInviteConfirmation(testEmail, inviteRequestResponse.result.get.uuid.get)
                  verify(mockMailgunClient).sendRequestInviteConfirmation(testEmail2, inviteRequestResponse2.result.get.uuid.get)
                  verify(mockMailgunClient).sendRequestInviteConfirmation(testEmail3, inviteRequestResponse3.result.get.uuid.get)
                  // Get the request back
                  val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
                  Get("/admin/invite/requests") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                    val inviteRequests = responseAs[InviteRequests]
                    writeJsonOutput("inviteRequestsResponse", responseAs[String])
                    inviteRequests.inviteRequests(0).email should be(testEmail)
                    inviteRequests.inviteRequests(1).email should be(testEmail2)
                    inviteRequests.inviteRequests(2).email should be(testEmail3)
                    // Get order number for invites
                    Get("/invite/request/" + inviteRequestResponse.result.get.uuid.get) ~> route ~> check {
                      responseAs[InviteRequestQueueNumber].queueNumber should be(1)
                    }
                    Get("/invite/request/" + inviteRequestResponse2.result.get.uuid.get) ~> route ~> check {
                      responseAs[InviteRequestQueueNumber].queueNumber should be(2)
                    }
                    Get("/invite/request/" + inviteRequestResponse3.result.get.uuid.get) ~> route ~> check {
                      responseAs[InviteRequestQueueNumber].queueNumber should be(3)
                    }

                    // Delete the middle invite request
                    Delete("/admin/invite/request/" + inviteRequestResponse2.result.get.uuid.get) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                      val deleteInviteRequestResponse = responseAs[DestroyResult]
                      writeJsonOutput("deleteInviteRequestResponse", responseAs[String])
                      deleteInviteRequestResponse.destroyed.size should be(1)
                    }
                    // Verify that the last one is now number 2 
                    Get("/invite/request/" + inviteRequestResponse3.result.get.uuid.get) ~> route ~> check {
                      responseAs[InviteRequestQueueNumber].queueNumber should be(2)
                    }
                    
                    // Accept invite request  
                    Post("/admin/invite/request/" + inviteRequestResponse.result.get.uuid.get + "/accept") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                      val acceptInviteRequestResponse = responseAs[SetResult]
                      writeJsonOutput("acceptInviteRequestResponse", responseAs[String])
                      acceptInviteRequestResponse.uuid should not be None

                      // Should be able to resend invite
                      Post("/invite/" + acceptInviteRequestResponse.uuid.get + "/resend",
                        marshal(UserEmail(testInviteRequest.email)).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
                          val resendInviteResponse = responseAs[CountResult]
                          writeJsonOutput("resendInviteResponse", responseAs[String])
                          resendInviteResponse.count should be(1)
                      }
                    }
                    verify(mockMailgunClient, times(2)).sendInvite(anyObject())
                    
                    // Verify that the last one is now number 1 
                    Get("/invite/request/" + inviteRequestResponse3.result.get.uuid.get) ~> route ~> check {
                      responseAs[InviteRequestQueueNumber].queueNumber should be(1)
                    }

                    // Get the invites
                    Get("/admin/invites") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                      val invites = responseAs[Invites]
                      writeJsonOutput("invitesResponse", responseAs[String])
                      assert(invites.invites.size === 1)
                      // Get invite
                      Get("/invite/" + invites.invites(0).code.toHexString + "?email=" + invites.invites(0).email) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
                        val inviteResponse = responseAs[InviteResult]
                        writeJsonOutput("inviteResponse", responseAs[String])
                        inviteResponse.email should be(invites.invites(0).email)
                        inviteResponse.accepted should be(None)
                      }
                      // Accept invite
                      val testPassword = "testPassword"
                      Post("/invite/" + invites.invites(0).code.toHexString + "/accept",
                        marshal(SignUp(invites.invites(0).email, testPassword, Some(1), None)).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
                          val acceptInviteResponse = responseAs[SetResult]
                          writeJsonOutput("acceptInviteResponse", responseAs[String])
                          acceptInviteResponse.uuid should not be None
                          // Should be possible to authenticate with the new email/password
                          val newUserAuthenticateResponse =
                            emailPasswordAuthenticate(invites.invites(0).email, testPassword)

                          // Should create admin because of signUpMode="ALFA" setting in application.conf
                          newUserAuthenticateResponse.userType should equal(Token.ADMIN)

                          // When getting account, emailConfirmed should not be none
                          Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", newUserAuthenticateResponse.token.get)) ~> route ~> check {
                            writeJsonOutput("emailVerifiedAccountResponse", responseAs[String])
                            val accountResponse = responseAs[User]
                            accountResponse.emailVerified should not be None
                          }

                          // Should return accepted when getting invite again
                          Get("/invite/" + invites.invites(0).code.toHexString + "?email=" + invites.invites(0).email) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
                            val acceptedInviteResponse = responseAs[InviteResult]
                            writeJsonOutput("acceptedInviteResponse", responseAs[String])
                            acceptedInviteResponse.email should be(invites.invites(0).email)
                            acceptedInviteResponse.accepted should not be None
                          }
                        }
				    }
                    // Try post accepted invite request again, and verify that user
	                Post("/invite/request",
				      marshal(testInviteRequest).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
				        val repostedInviteRequestResult = responseAs[InviteRequestResult]
				        repostedInviteRequestResult.resultType should be (USER_RESULT)
				        repostedInviteRequestResult.queueNumber should be (None)
				        repostedInviteRequestResult.result should be (None)
				    }
				    // Try post existing invite request again, and verify that right queue number is received
	                Post("/invite/request",
				      marshal(testInviteRequest3).right.get) ~> addHeader("Content-Type", "application/json") ~> route ~> check {
				        val repostedInviteRequestResult3 = responseAs[InviteRequestResult]
				        repostedInviteRequestResult3.resultType should be (INVITE_REQUEST_RESULT)
				        repostedInviteRequestResult3.queueNumber.get should be (1)
				        repostedInviteRequestResult3.result.get.uuid should not be (None)
				        repostedInviteRequestResult3.result.get.modified should not be (None)
				    }
                  }
                }
            }
        }
    }
  }

  def emailPasswordAuthenticate(email: String, password: String): SecurityContext = {
    Post("/authenticate") ~> addHeader(Authorization(BasicHttpCredentials(email, password))) ~> route ~> check {
      responseAs[SecurityContext]
    }
  }

  def emailPasswordAuthenticateRememberMe(email: String, password: String): SecurityContext = {
    Post("/authenticate", marshal(AuthenticatePayload(true, None)).right.get) ~> addHeader(Authorization(BasicHttpCredentials(email, password))) ~> route ~> check {
      responseAs[SecurityContext]
    }
  }

  def putNewNote(newNote: Note, authenticateResponse: SecurityContext): SetResult = {
    Put("/" + authenticateResponse.userUUID + "/note",
      marshal(newNote).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        responseAs[SetResult]
      }
  }

  def putExistingNote(existingNote: Note, noteUUID: UUID, authenticateResponse: SecurityContext): SetResult = {
    Put("/" + authenticateResponse.userUUID + "/note/" + noteUUID.toString(),
      marshal(existingNote).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        responseAs[SetResult]
      }
  }

  def putNewTask(newTask: Task, authenticateResponse: SecurityContext, collectiveUUID: Option[UUID] = None): SetResult = {
    val ownerUUID = if (collectiveUUID.isDefined) collectiveUUID.get else authenticateResponse.userUUID
    Put("/" + ownerUUID + "/task",
      marshal(newTask).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        responseAs[SetResult]
      }
  }

  def putExistingTask(existingTask: Task, taskUUID: UUID, authenticateResponse: SecurityContext,
    collectiveUUID: Option[UUID] = None): SetResult = {
    val ownerUUID = if (collectiveUUID.isDefined) collectiveUUID.get else authenticateResponse.userUUID
    Put("/" + ownerUUID + "/task/" + taskUUID.toString(),
      marshal(existingTask).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        responseAs[SetResult]
      }
  }

  def getItem(itemUUID: UUID, authenticateResponse: SecurityContext): Item = {
    Get("/" + authenticateResponse.userUUID + "/item/" + itemUUID) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
      responseAs[Item]
    }
  }

  def getTask(taskUUID: UUID, authenticateResponse: SecurityContext, collectiveUUID: Option[UUID] = None): Task = {
    val ownerUUID = if (collectiveUUID.isDefined) collectiveUUID.get else authenticateResponse.userUUID
    Get("/" + ownerUUID + "/task/" + taskUUID) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
      responseAs[Task]
    }
  }

  def getNote(noteUUID: UUID, authenticateResponse: SecurityContext): Note = {
    Get("/" + authenticateResponse.userUUID + "/note/" + noteUUID) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
      responseAs[Note]
    }
  }

  def getUserUUID(email: String, authenticateResponse: SecurityContext): UUID = {
    Get("/user?email=" + email) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
      responseAs[PublicUser].uuid
    }
  }

  // Helper file writer
  def writeJsonOutput(filename: String, contents: String): Unit = {
    Some(new PrintWriter(db.TEST_DATA_DESTINATION + "/" + filename + ".json")).foreach { p => p.write(contents); p.close }
  }
}
