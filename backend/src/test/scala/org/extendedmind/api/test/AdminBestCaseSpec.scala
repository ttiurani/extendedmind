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
 * Best case test for admin routes. Also generates .json files.
 */
class AdminBestCaseSpec extends ServiceSpecBase {

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

  describe("In the best case, AdminService") {
    it("should successfully put invite request with PUT to /admin/invite/request "
      + "and get it back with forced UUID from GET to /invite/request/[UUID]") {
      val uuid = "f107899f-dd00-4754-bd7e-7ffa5399d604"
      val newInviteRequest = InviteRequest(
        Some(UUID.fromString(uuid)),
        "test@example.com",
        Some("messageId"),
        None,
        None)
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Put("/admin/invite/request",
        marshal(newInviteRequest).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          writeJsonOutput("inviteRequestResponse", responseAs[String])
          val inviteRequestResponse = responseAs[SetResult]
          inviteRequestResponse.uuid.get.toString should equal(uuid)
          inviteRequestResponse.modified should not be None

          Get("/invite/request/" + uuid) ~> route ~> check {
            responseAs[InviteRequestQueueNumber].queueNumber should be(1)
          }
          Get("/admin/invite/requests") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
            val inviteRequests = responseAs[InviteRequests]
            inviteRequests.inviteRequests(0).uuid.get.toString() should equal(uuid)
            inviteRequests.inviteRequests(0).emailId.get should equal("messageId")
          }
        }
    }
    it("should successfully create new collective with PUT to /collective"
      + "update it with PUT to /collective/[collectiveUUID] "
      + "and get it back with GET to /collective/[collectiveUUID]") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      val testCollective = Collective("Test", None)
      Put("/collective",
        marshal(testCollective).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          writeJsonOutput("putCollectiveResponse", responseAs[String])
          val putCollectiveResponse = responseAs[SetResult]
          putCollectiveResponse.uuid should not be None
          putCollectiveResponse.modified should not be None

          // Authenticating again should have the new collective
          val reauthenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
          reauthenticateResponse.collectives should not be None
          reauthenticateResponse.collectives.get.get(putCollectiveResponse.uuid.get).get._1 should equal(testCollective.title)
          reauthenticateResponse.collectives.get.get(putCollectiveResponse.uuid.get).get._2 should equal(0)
          reauthenticateResponse.collectives.get.get(putCollectiveResponse.uuid.get).get._3 should equal(false)

          // Update collective
          Put("/collective/" + putCollectiveResponse.uuid.get,
            marshal(testCollective.copy(description = Some("test description"))).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", reauthenticateResponse.token.get)) ~> route ~> check {
              writeJsonOutput("putExistingCollectiveResponse", responseAs[String])
              val putExistingCollectiveResponse = responseAs[SetResult]
              putExistingCollectiveResponse.uuid should be(None)
              assert(putExistingCollectiveResponse.modified > putCollectiveResponse.modified)
              // Get it back
              Get("/collective/" + putCollectiveResponse.uuid.get) ~> addCredentials(BasicHttpCredentials("token", reauthenticateResponse.token.get)) ~> route ~> check {
                val collectiveResponse = responseAs[Collective]
                writeJsonOutput("collectiveResponse", responseAs[String])
                collectiveResponse.description.get should be("test description")

                // Should be possible to assign read/write access to new collective
                val lauriAuthenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
                lauriAuthenticateResponse.collectives.get.get(putCollectiveResponse.uuid.get) should equal(None)

                Post("/collective/" + putCollectiveResponse.uuid.get + "/user/" + getUserUUID(LAURI_EMAIL, reauthenticateResponse),
                  marshal(UserAccessRight(Some(2))).right.get) ~> addCredentials(BasicHttpCredentials("token", reauthenticateResponse.token.get)) ~> route ~> check {
                    val postCollectiveUserPermissionResponse = responseAs[SetResult]
                    writeJsonOutput("postCollectiveUserPermissionResponse", responseAs[String])
                    assert(postCollectiveUserPermissionResponse.modified > putExistingCollectiveResponse.modified)
                    val lauriReauthenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
                    lauriReauthenticateResponse.collectives.get.get(putCollectiveResponse.uuid.get).get._2 should equal(2)
                  }
              }
            }
        }
    }
    it("should successfully get user with GET /user?email=[email]") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Get("/user?email=" + LAURI_EMAIL) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("userResponse", responseAs[String])
        val publicUser = responseAs[PublicUser]
        publicUser.uuid should not be None
      }
    }
    it("should successfully get collective items with GET to /[collectiveUUID]/items "
      + "put new task on PUT to /[collectiveUUID]/task "
      + "update it with PUT to /[collectiveUUID]/task/[itemUUID] "
      + "and get it back with GET to /[collectiveUUID]/task/[itemUUID]") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      val collectiveUuidMap = getCollectiveUUIDMap(authenticateResponse)
      val emtUUID = collectiveUuidMap.get("extended mind technologies").get
      Get("/" + emtUUID + "/items") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val itemsResponse = responseAs[Items]
        writeJsonOutput("collectiveItemsResponse", responseAs[String])
        itemsResponse.items should not be None
        itemsResponse.tasks should not be None
        itemsResponse.tasks.get.length should equal(1)
        itemsResponse.notes should not be None
      }
      val newTask = Task("change border colour to lighter gray", None, None, None, None, None, None)
      val putTaskResponse = putNewTask(newTask, authenticateResponse, Some(emtUUID))
      val putExistingTaskResponse = putExistingTask(newTask.copy(description = Some("e.g. #EDEDED")),
        putTaskResponse.uuid.get, authenticateResponse, Some(emtUUID))
      assert(putExistingTaskResponse.modified > putTaskResponse.modified)

      val updatedTask = getTask(putTaskResponse.uuid.get, authenticateResponse, Some(emtUUID))
      updatedTask.description should not be None
    }
    it("should successfully change user type with POST to /user/UUID/type/INT") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Get("/user?email=" + INFO_EMAIL) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val infoUser = responseAs[PublicUser]
        Post("/admin/user/" + infoUser.uuid + "/type/" + Token.ALFA) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          writeJsonOutput("changeUserTypeResponse", responseAs[String])
          val changeUserTypeResponse = responseAs[SetResult]
          changeUserTypeResponse.modified should not be None
          val infoAuthenticateResponse = emailPasswordAuthenticate(INFO_EMAIL, INFO_PASSWORD)
          infoAuthenticateResponse.userType should equal(Token.ALFA)
          Post("/admin/user/" + infoUser.uuid + "/type/" + Token.NORMAL) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
            val infoReAuthenticateResponse = emailPasswordAuthenticate(INFO_EMAIL, INFO_PASSWORD)
            infoReAuthenticateResponse.userType should equal(Token.NORMAL)
          }
        }
      }
    }
    it("should successfully reset tokens with POST to /admin/tokens/reset, " +
      "rebuild user indexes with POST to /admin/users/rebuild, " +
      "and rebuild item indexes with POST to /admin/[userUUID]/items/rebuild") {
      Post("/admin/tokens/reset") ~> addCredentials(BasicHttpCredentials("token", emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD).token.get)) ~> route ~> check {
        writeJsonOutput("tokensResetResponse", responseAs[String])
        val countResult = responseAs[CountResult]
        countResult.count should be(6)
      }
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Post("/admin/users/rebuild") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("usersRebuildResponse", responseAs[String])
        val countResult = responseAs[CountResult]
        countResult.count should be(3)
      }
      Post("/admin/user/" + authenticateResponse.userUUID + "/items/rebuild") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("itemsRebuildResponse", responseAs[String])
        val countResult = responseAs[CountResult]
        countResult.count should be(22)
      }
    }
    it("should successfully get statistics with GET to /admin") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Get("/admin") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val statistics = responseAs[Statistics]
        writeJsonOutput("statisticsResponse", responseAs[String])
      }
    }
    it("should successfully get users with GET to /admin/users") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Get("/admin/users") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val users = responseAs[Users]
        writeJsonOutput("usersResponse", responseAs[String])
      }
    }
  }

}
