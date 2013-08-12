package org.extendedmind.api.test
import org.extendedmind.bl.ItemActions
import scaldi.Module
import org.mockito.Mockito._
import org.extendedmind.domain.User
import org.extendedmind.test.SpecBase
import java.io.PrintWriter
import spray.testkit.ScalatestRouteTest
import org.extendedmind.api.Service
import org.extendedmind.SettingsExtension
import org.extendedmind.test.SpraySpecBase
import org.extendedmind.bl.SecurityActions
import spray.http.HttpHeaders.Authorization
import spray.http.BasicHttpCredentials
import java.util.UUID
import org.extendedmind.domain.UserWrapper
import org.extendedmind.test.TestImpermanentGraphDatabase
import org.extendedmind.db.GraphDatabase
import org.extendedmind.test.TestGraphDatabase._
import org.extendedmind.security.SecurityContext
import org.extendedmind.api.JsonImplicits._
import spray.httpx.SprayJsonSupport._
import spray.httpx.marshalling._


class ServiceSpec extends SpraySpecBase{

  // Mock out all action classes to test only the Service class
  val mockItemActions = mock[ItemActions]
  val mockSecurityActions = mock[SecurityActions]

  // Create test database
  var db: TestImpermanentGraphDatabase = null

  object ServiceTestConfiguration extends Module{
    bind [ItemActions] to mockItemActions
    bind [SecurityActions] to mockSecurityActions
    bind [GraphDatabase] to db
  }
  def configurations = ServiceTestConfiguration 

  before{
    db = new TestImpermanentGraphDatabase
    db.insertTestUsers
  }

  // Reset mocks after each test to be able to use verify after each test
  after{
    reset(mockItemActions)
    reset(mockSecurityActions)
  }
  
  describe("Extended Mind Service"){
    it("should return token on authenticate"){
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      authenticateResponse.token should not be (None)
    }
    it("should swap token on token authentication"){
      val authenticateResponse = emailPasswordAuthenticate(TIMO_EMAIL, TIMO_PASSWORD)
      Post("/authenticate") ~> addHeader(Authorization(BasicHttpCredentials("token", authenticateResponse.token.get))) ~> emRoute ~> check { 
        val tokenAuthenticateResponse = entityAs[SecurityContext]
        tokenAuthenticateResponse.token.get should not be (authenticateResponse.token.get)
      }
    }
  }
  
  def emailPasswordAuthenticate(email: String, password: String): SecurityContext = {
    Post("/authenticate") ~> addHeader(Authorization(BasicHttpCredentials(TIMO_EMAIL, TIMO_PASSWORD))) ~> emRoute ~> check { 
      return entityAs[SecurityContext]
    }
  }
}