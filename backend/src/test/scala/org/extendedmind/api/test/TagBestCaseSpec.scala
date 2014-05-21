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

/**
 * Best case test for tags. Also generates .json files.
 */
class TagBestCaseSpec extends ServiceSpecBase {

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

  describe("In the best case, TagService") {
    it("should successfully put new tag on PUT to /[userUUID]/tag, "
      + "update it with PUT to /[userUUID]/tag/[tagUUID] "
      + "and get it back with GET to /[userUUID]/tag/[tagUUID] "
      + "and delete it with DELETE to /[userUUID]/tag/[itemUUID] "
      + "and undelete it with POST to /[userUUID]/tag/[itemUUID]") {
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      val newTag = Tag("home", None, None, CONTEXT, None)
      val newTag2 = Tag("office", None, None, CONTEXT, None)
      Put("/" + authenticateResponse.userUUID + "/tag",
        marshal(newTag).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
          val putTagResponse = responseAs[SetResult]
          writeJsonOutput("putTagResponse", responseAs[String])
          putTagResponse.modified should not be None
          putTagResponse.uuid should not be None

          Put("/" + authenticateResponse.userUUID + "/tag",
            marshal(newTag2).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
              val putTag2Response = responseAs[SetResult]
              val updatedTag = newTag.copy(description = Some("my home"))
              Put("/" + authenticateResponse.userUUID + "/tag/" + putTagResponse.uuid.get,
                marshal(updatedTag).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                  val putExistingTagResponse = responseAs[String]
                  writeJsonOutput("putExistingTagResponse", putExistingTagResponse)
                  putExistingTagResponse should include("modified")
                  putExistingTagResponse should not include ("uuid")
                  Get("/" + authenticateResponse.userUUID + "/tag/" + putTagResponse.uuid.get) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                    val tagResponse = responseAs[Tag]
                    writeJsonOutput("tagResponse", responseAs[String])
                    tagResponse.description.get should be("my home")
                    // Add the tag to a Note
                    val newNote = Note("bike details", None, Some("model: 12345"), None,
                      Some(ExtendedItemRelationships(None, None, Some(scala.List(putTagResponse.uuid.get)))))
                    val putNoteResponse = putNewNote(newNote, authenticateResponse)
                    val noteWithTag = getNote(putNoteResponse.uuid.get, authenticateResponse)
                    noteWithTag.relationships.get.tags.get should be(scala.List(putTagResponse.uuid.get))
                    Delete("/" + authenticateResponse.userUUID + "/tag/" + putTagResponse.uuid.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                      val deleteTagResponse = responseAs[String]
                      writeJsonOutput("deleteTagResponse", deleteTagResponse)
                      deleteTagResponse should include("deleted")
                      Get("/" + authenticateResponse.userUUID + "/tag/" + putTagResponse.uuid.get) ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                        val failure = responseAs[String]
                        status should be(BadRequest)
                        failure should startWith("Item " + putTagResponse.uuid.get + " is deleted")
                      }
                      // Change note context to new value and verify that change works
                      Put("/" + authenticateResponse.userUUID + "/note/" + putNoteResponse.uuid.get,
                        marshal(newNote.copy(relationships = Some(ExtendedItemRelationships(None, None, Some(scala.List(putTag2Response.uuid.get)))))).right.get) ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                          val reputExistingNoteResponse = responseAs[SetResult]
                          reputExistingNoteResponse.modified should not be None
                      }
                      
                      Post("/" + authenticateResponse.userUUID + "/tag/" + putTagResponse.uuid.get + "/undelete") ~> addHeader("Content-Type", "application/json") ~> addCredentials(BasicHttpCredentials("token", authenticateResponse.token.get)) ~> route ~> check {
                        val undeleteTagResponse = responseAs[String]
                        writeJsonOutput("undeleteTagResponse", undeleteTagResponse)
                        undeleteTagResponse should include("modified")
                        val undeletedTag = getTag(putTagResponse.uuid.get, authenticateResponse)
                        undeletedTag.deleted should be(None)
                        undeletedTag.modified should not be (None)
                      }
                    }
                  }
                }
            }
        }
    }
  }

}
