/**
 * Copyright (c) 2013-2016 Extended Mind Technologies Oy
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
import spray.http.StatusCodes._
import org.mockito.ArgumentCaptor

/**
 * Best case test for user routes. Also generates .json files.
 */
class UserBestCaseSpec extends ServiceSpecBase {

  val mockMailClient = mock[MailClient]

  object TestDataGeneratorConfiguration extends Module {
    bind[GraphDatabase] to db
    bind[MailClient] to mockMailClient
  }

  override def configurations = TestDataGeneratorConfiguration :: new Configuration(settings, actorRefFactory)

  before {
    db.insertTestData()
  }

  after {
    cleanDb(db.ds.gds)
    reset(mockMailClient)
  }

  describe("In the best case, UserService") {
    it("should create an administrator with POST to /signup because adminSignUp is set to true " +
       "and resend verification email with POST to /email/resend") {
      val testEmail = "example@example.com"
      stub(mockMailClient.sendEmailVerificationLink(mockEq(testEmail), anyObject())).toReturn(
        Future { SendEmailResponse("OK", "1234") })
      val verificationCodeCaptor: ArgumentCaptor[Long] = ArgumentCaptor.forClass(classOf[Long])
      val emailCaptor: ArgumentCaptor[String] = ArgumentCaptor.forClass(classOf[String])

      val signUp = SignUp(testEmail, "infopwd", Some("Info account"), Some("info"), None, None, Some(1), None)
      Post("/signup",
        marshal(signUp).right.get) ~> route ~> check {
          val signUpResponse = responseAs[String]
          writeJsonOutput("signUpResponse", signUpResponse)
          verify(mockMailClient).sendEmailVerificationLink(emailCaptor.capture(), verificationCodeCaptor.capture())
          val verificationCode = verificationCodeCaptor.getValue
          signUpResponse should include("uuid")
          signUpResponse should include("modified")
          val authenticationResponse = emailPasswordAuthenticate(signUp.email, signUp.password)
          authenticationResponse.userType should be(0)
          authenticationResponse.cohort.get should be(1)

          reset(mockMailClient)
          stub(mockMailClient.sendEmailVerificationLink(testEmail, verificationCode)).toReturn(
            Future { SendEmailResponse("OK", "4321") })

          // Should resend verification link email
          Post("/email/resend") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticationResponse.token.get)) ~> route ~> check {
            val resendResponse = responseAs[CountResult]
            writeJsonOutput("emailResendResponse", responseAs[String])
            verify(mockMailClient).sendEmailVerificationLink(testEmail, verificationCode)
          }
        }
    }
    it("should successfully get user with GET to /account, "
      + "change email and set onboarded with PUT to /account "
      + "and get the changed email and onboarded status back") {
      val authenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
      val initialUIPreferences = "{hideFooter: true}"
      val newUser = User("ignored@example.com", None, None, None, None, None, Some(OwnerPreferences(Some("web"), Some(initialUIPreferences))))
      Put("/account",
        marshal(newUser).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          writeJsonOutput("putAccountResponse", responseAs[String])
          val putAccountResponse = responseAs[SetResult]
          putAccountResponse.modified should not be None
        }
      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val accountResponse = responseAs[User]
        accountResponse.inboxId should not be None
        accountResponse.shortId should be (None)
        accountResponse.preferences.get.onboarded.get should be("web")
        accountResponse.preferences.get.ui.get should be(initialUIPreferences)

        val newEmailAuthenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
        newEmailAuthenticateResponse.userUUID should not be None
        newEmailAuthenticateResponse.inboxId should not be None
        newEmailAuthenticateResponse.preferences.get.onboarded.get should be("web")

        // Add more UI preferences, make sure onboarded isn't removed
        val newUIPreferences = "{hideFooter: true, hidePlus: true}"
        Put("/account", marshal(accountResponse.copy(email = None, preferences = Some(OwnerPreferences(None, Some(newUIPreferences))))).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", newEmailAuthenticateResponse.token.get)) ~> route ~> check {
          val putAccountResponse = responseAs[SetResult]
          putAccountResponse.modified should not be None
          Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", newEmailAuthenticateResponse.token.get)) ~> route ~> check {
            val accountResponse = responseAs[User]
            accountResponse.preferences.get.onboarded.get should be("web")
            accountResponse.preferences.get.ui.get should be(newUIPreferences)
            // Add more onboarded values, make sure UI preferences isn't removed
            Put("/account", marshal(accountResponse.copy(email = None, preferences = Some(OwnerPreferences(Some("{web}"), None)))).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
              Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", newEmailAuthenticateResponse.token.get)) ~> route ~> check {
                val accountResponse2 = responseAs[User]
                accountResponse2.preferences.get.onboarded.get should be("{web}")
                accountResponse2.preferences.get.ui.get should be(newUIPreferences)
              }
            }
          }
        }
      }

    }

    it("should successfully get the correct response from GET to /account " +
       "that matches what is returned from GET /collective/[UUID]") {
      val timoAuthenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      val emtCollectiveUUID = timoAuthenticateResponse.collectives.get.find(collectiveInfo => collectiveInfo._2._1 == "extended mind technologies").get._1

      // TIMO IS THE FOUNDER OF EMT AND EM COLLECTIVES

      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", timoAuthenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("accountResponse", responseAs[String])
        val accountResponse = responseAs[User]
        accountResponse.uuid.get should equal(timoAuthenticateResponse.userUUID)
        accountResponse.email.get should equal(TIMO_EMAIL)
        accountResponse.collectives.get.size should be (2)
        val commonCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._2._3).get
        commonCollective._2._4.get.handle.get should be("extended-mind")
        commonCollective._2._4.get.shortId should not be(None)
        commonCollective._2._4.get.description should not be(None)
        commonCollective._2._4.get.access should be(None)
        commonCollective._2._4.get.inboxId should not be(None)
        commonCollective._2._4.get.apiKey should be(None)
        commonCollective._2._4.get.modified should be(None)
        commonCollective._2._4.get.created should be(None)
        commonCollective._2._4.get.creator should be(None)

        Get("/collective/" + commonCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", timoAuthenticateResponse.token.get)) ~> route ~> check {
          val fullCommonCollective = responseAs[Collective]
          fullCommonCollective.apiKey should not be (None)
          fullCommonCollective.handle.get should be(commonCollective._2._4.get.handle.get)
          fullCommonCollective.shortId.get should not be(None)
          fullCommonCollective.description.get should be(commonCollective._2._4.get.description.get)
          fullCommonCollective.inboxId.get should be (commonCollective._2._4.get.inboxId.get)
          fullCommonCollective.modified should not be(None)
          fullCommonCollective.created should not be(None)
          fullCommonCollective.creator.get should be(timoAuthenticateResponse.userUUID)
          // Not even the founder can get a full access list for the common collective
          fullCommonCollective.access should be (None)
        }

        val emtCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._1 == emtCollectiveUUID).get
        emtCollective._2._4.get.handle.get should be("emt")
        emtCollective._2._4.get.shortId should not be(None)
        emtCollective._2._4.get.access should not be(None)
        emtCollective._2._4.get.access.get.size should be(2)
        emtCollective._2._4.get.access.get.find(accessInfo => accessInfo._2 == "Timo") should be (None)
        emtCollective._2._4.get.description should not be(None)
        emtCollective._2._4.get.handle should not be(None)
        emtCollective._2._4.get.inboxId should not be(None)
        emtCollective._2._4.get.apiKey should be(None)
        emtCollective._2._4.get.modified should be(None)
        emtCollective._2._4.get.created should be(None)
        emtCollective._2._4.get.creator should be(None)

        Get("/collective/" + emtCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", timoAuthenticateResponse.token.get)) ~> route ~> check {
          val fullEMTCollective = responseAs[Collective]
          fullEMTCollective.apiKey should not be (None)
          fullEMTCollective.description.get should be(emtCollective._2._4.get.description.get)
          fullEMTCollective.inboxId.get should be (emtCollective._2._4.get.inboxId.get)
          fullEMTCollective.modified should not be(None)
          fullEMTCollective.created should not be(None)
          fullEMTCollective.creator.get should be(timoAuthenticateResponse.userUUID)
          fullEMTCollective.access.get.find(accessInfo => accessInfo._2 == "Timo") should not be(None)
        }

        Get("/short/" + accountResponse.shortId.get) ~> route ~> check {
          val publicItemHeaderResponse = responseAs[PublicItemHeader]
          publicItemHeaderResponse.handle should be ("timo")
          publicItemHeaderResponse.path should be (None)
        }

      }

      // LAURI HAS READ/WRITE ACCESS TO EMT AND READ TO EM

      val lauriAuthenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", lauriAuthenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("accountResponseReadWrite", responseAs[String])
        val accountResponse = responseAs[User]
        val commonCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._2._3).get
        commonCollective._2._4.get.handle.get should be("extended-mind")
        commonCollective._2._4.get.shortId should not be(None)
        commonCollective._2._4.get.description should not be(None)
        commonCollective._2._4.get.access should be(None)
        commonCollective._2._4.get.inboxId should be(None)
        commonCollective._2._4.get.apiKey should be(None)
        commonCollective._2._4.get.modified should be(None)
        commonCollective._2._4.get.created should be(None)
        commonCollective._2._4.get.creator should be(None)

        Get("/collective/" + commonCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", lauriAuthenticateResponse.token.get)) ~> route ~> check {
          val fullCommonCollective = responseAs[Collective]
          fullCommonCollective.apiKey should be (None)
          fullCommonCollective.handle.get should be(commonCollective._2._4.get.handle.get)
          fullCommonCollective.shortId should not be(None)
          fullCommonCollective.description.get should be(commonCollective._2._4.get.description.get)
          fullCommonCollective.inboxId should be (None)
          fullCommonCollective.modified should be(None)
          fullCommonCollective.created should be(None)
          fullCommonCollective.creator should be(None)
          fullCommonCollective.access should be (None)
        }

        val emtCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._1 == emtCollectiveUUID).get
        emtCollective._2._4.get.handle.get should be("emt")
        emtCollective._2._4.get.handle.get should not be(None)
        emtCollective._2._4.get.access should not be(None)
        emtCollective._2._4.get.access.get.size should be(2)
        emtCollective._2._4.get.access.get.find(accessInfo => accessInfo._2 == LAURI_EMAIL) should be (None)
        emtCollective._2._4.get.description should not be(None)
        emtCollective._2._4.get.handle should not be(None)
        emtCollective._2._4.get.inboxId should not be(None)
        emtCollective._2._4.get.apiKey should be(None)
        emtCollective._2._4.get.modified should be(None)
        emtCollective._2._4.get.created should be(None)
        emtCollective._2._4.get.creator should be(None)
        Get("/collective/" + emtCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", lauriAuthenticateResponse.token.get)) ~> route ~> check {
          val fullEMTCollective = responseAs[Collective]
          fullEMTCollective.apiKey should be (None) // This needs to be none, only admin can see the api key
          fullEMTCollective.description.get should be(emtCollective._2._4.get.description.get)
          fullEMTCollective.inboxId.get should be (emtCollective._2._4.get.inboxId.get)
          fullEMTCollective.modified should not be(None)
          fullEMTCollective.created should not be(None)
          fullEMTCollective.creator.get should be(timoAuthenticateResponse.userUUID)
          fullEMTCollective.access.get.find(accessInfo => accessInfo._2 == LAURI_EMAIL) should not be(None)
        }
      }

      // JP HAS READ ACCESS TO EMT AND READ TO EM

      val jpAuthenticateResponse = emailPasswordAuthenticate(JP_EMAIL, JP_PASSWORD)
      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", jpAuthenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("accountResponseRead", responseAs[String])
        val accountResponse = responseAs[User]
        accountResponse.uuid.get should equal(jpAuthenticateResponse.userUUID)
        accountResponse.email.get should equal(JP_EMAIL)
        accountResponse.collectives.get.size should be (2)
        val commonCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._2._3).get
        commonCollective._2._4.get.handle.get should be("extended-mind")
        commonCollective._2._4.get.shortId should not be(None)
        commonCollective._2._4.get.description should not be(None)
        commonCollective._2._4.get.access should be(None)
        commonCollective._2._4.get.inboxId should be(None)
        commonCollective._2._4.get.apiKey should be(None)
        commonCollective._2._4.get.modified should be(None)
        commonCollective._2._4.get.created should be(None)
        commonCollective._2._4.get.creator should be(None)

        Get("/collective/" + commonCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", jpAuthenticateResponse.token.get)) ~> route ~> check {
          val fullCommonCollective = responseAs[Collective]
          fullCommonCollective.apiKey should be (None)
          fullCommonCollective.handle.get should be(commonCollective._2._4.get.handle.get)
          fullCommonCollective.shortId should not be(None)
          fullCommonCollective.description.get should be(commonCollective._2._4.get.description.get)
          fullCommonCollective.inboxId should be (None)
          fullCommonCollective.modified should be(None)
          fullCommonCollective.created should be(None)
          fullCommonCollective.creator should be(None)
          fullCommonCollective.access should be (None)
        }
        val emtCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._1 == emtCollectiveUUID).get
        emtCollective._2._4.get.handle.get should be("emt")
        emtCollective._2._4.get.shortId should not be(None)
        emtCollective._2._4.get.access should be(None)
        emtCollective._2._4.get.description should not be(None)
        emtCollective._2._4.get.handle should not be(None)
        emtCollective._2._4.get.inboxId should be(None)
        emtCollective._2._4.get.apiKey should be(None)
        emtCollective._2._4.get.modified should be(None)
        emtCollective._2._4.get.created should be(None)
        emtCollective._2._4.get.creator should be(None)
        Get("/collective/" + emtCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", jpAuthenticateResponse.token.get)) ~> route ~> check {
          val fullEMTCollective = responseAs[Collective]
          fullEMTCollective.apiKey should be (None) // This needs to be none, only admin can see the api key
          fullEMTCollective.description.get should be(emtCollective._2._4.get.description.get)
          fullEMTCollective.inboxId should be (None)
          fullEMTCollective.modified should be(None)
          fullEMTCollective.created should be(None)
          fullEMTCollective.creator should be(None)
          fullEMTCollective.access should be(None)
        }

      }

      // INFO HAS READ ACCESS TO EM

      val infoAuthenticateResponse = emailPasswordAuthenticate(INFO_EMAIL, INFO_PASSWORD)
      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", infoAuthenticateResponse.token.get)) ~> route ~> check {
        writeJsonOutput("accountResponseNormal", responseAs[String])
        val accountResponse = responseAs[User]
        accountResponse.uuid.get should equal(infoAuthenticateResponse.userUUID)
        accountResponse.email.get should equal(INFO_EMAIL)
        accountResponse.collectives.get.size should be (1)
        val commonCollective = accountResponse.collectives.get.find(collectiveInfo => collectiveInfo._2._3).get
        commonCollective._2._4.get.handle.get should be("extended-mind")
        commonCollective._2._4.get.shortId should not be(None)
        commonCollective._2._4.get.description should not be(None)
        commonCollective._2._4.get.access should be(None)
        commonCollective._2._4.get.inboxId should be(None)
        commonCollective._2._4.get.apiKey should be(None)
        commonCollective._2._4.get.modified should be(None)
        commonCollective._2._4.get.created should be(None)
        commonCollective._2._4.get.creator should be(None)
        Get("/collective/" + commonCollective._1) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", infoAuthenticateResponse.token.get)) ~> route ~> check {
          val fullCommonCollective = responseAs[Collective]
          fullCommonCollective.apiKey should be (None)
          fullCommonCollective.handle.get should be(commonCollective._2._4.get.handle.get)
          fullCommonCollective.shortId should not be(None)
          fullCommonCollective.description.get should be(commonCollective._2._4.get.description.get)
          fullCommonCollective.inboxId should be (None)
          fullCommonCollective.modified should be(None)
          fullCommonCollective.created should be(None)
          fullCommonCollective.creator should be(None)
          fullCommonCollective.access should be (None)
        }
      }
    }
    it("should successfully change email with PUT to /email "
      + "and get the changed email back") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)

      val newEmail = UserEmail("timo.tiuraniemi@filosofianakatemia.fi")
      stub(mockMailClient.sendEmailVerificationLink(mockEq(newEmail.email), anyObject())).toReturn(
        Future { SendEmailResponse("OK", "1234") })
      val verificationCodeCaptor: ArgumentCaptor[Long] = ArgumentCaptor.forClass(classOf[Long])
      val emailCaptor: ArgumentCaptor[String] = ArgumentCaptor.forClass(classOf[String])

      Put("/email",
        marshal(newEmail).right.get) ~> addHeader("Content-Type", "application/json") ~> addHeader(Authorization(BasicHttpCredentials(TIMO_EMAIL, TIMO_PASSWORD))) ~> route ~> check {
          writeJsonOutput("putEmailResponse", responseAs[String])
          val putAccountResponse = responseAs[SetResult]
          putAccountResponse.modified should not be None
          verify(mockMailClient).sendEmailVerificationLink(emailCaptor.capture(), verificationCodeCaptor.capture())
      }
      Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val accountResponse = responseAs[User]
        accountResponse.email.get should equal(newEmail.email)
        accountResponse.shortId should not be (None)
      }
      val newEmailAuthenticateResponse = emailPasswordAuthenticate(newEmail.email, TIMO_PASSWORD)
      newEmailAuthenticateResponse.userUUID should not be None
    }
    it("should successfully delete user with DELETE to /account "
      + "and resurrect user with new authenticate") {
      val authenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
      val authenticateResponse2 = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)

      Delete("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials(LAURI_EMAIL, LAURI_PASSWORD)) ~> route ~> check {
        writeJsonOutput("deleteAccountResponse", responseAs[String])
        val deleteAccountResponse = responseAs[DeleteItemResult]
        deleteAccountResponse.result.modified should not be None

        // Should not be able to do anything else with any previous login
        Get("/account") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          status should be (Forbidden)
          val failure = responseAs[ErrorResult]
          failure.code should be(ERR_BASE_AUTHENTICATION_FAILED.number)
        }
        Get("/" + authenticateResponse2.userUUID + "/items") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse2.token.get)) ~> route ~> check {
          status should be (Forbidden)
          val failure = responseAs[ErrorResult]
          failure.code should be(ERR_BASE_AUTHENTICATION_FAILED.number)
        }
      }
      val adminAuthenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)

      Get("/admin/users") ~> addCredentials(BasicHttpCredentials("token", adminAuthenticateResponse.token.get)) ~> route ~> check {
        val users = responseAs[Users]
        val lauri = users.users.filter(user => {
          if (user.email.get == LAURI_EMAIL) true
          else false
        })
        lauri(0).deleted should not be None
      }

      // Resurrect with new authenticate
      val reauthenticateResponse = emailPasswordAuthenticate(LAURI_EMAIL, LAURI_PASSWORD)
      Get("/admin/users") ~> addCredentials(BasicHttpCredentials("token", adminAuthenticateResponse.token.get)) ~> route ~> check {
        val users = responseAs[Users]
        val lauri = users.users.filter(user => {
          if (user.email.get == LAURI_EMAIL) true
          else false
        })
        lauri(0).deleted should be(None)
      }
    }

    it("should successfully add handle with PATCH to /v2/users/UserUUID "
      + "and get shortId as response") {
      val authenticateResponse = emailPasswordAuthenticate(INFO_EMAIL, INFO_PASSWORD)
      Get("/v2/users/" + authenticateResponse.userUUID) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
        val accountResponse = responseAs[User]
        accountResponse.handle should be (None)
        accountResponse.shortId should be (None)
        println("here")
        Patch("/v2/users/" + authenticateResponse.userUUID,
          marshal(accountResponse.copy(handle = Some("info"))).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
            writeJsonOutput("patchUserResponse", responseAs[String])
            val patchUserResponse = responseAs[PatchUserResponse]
            patchUserResponse.shortId should not be None
            Get("/v2/short/" + patchUserResponse.shortId.get) ~> route ~> check {
              val publicItemHeaderResponse = responseAs[PublicItemHeader]
              publicItemHeaderResponse.handle should be ("info")
              publicItemHeaderResponse.path should be (None)
            }
        }
      }
    }
  }
}
