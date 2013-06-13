package org.extendedmind

import spray.routing.HttpService
import spray.routing.PathMatcher
import spray.routing.Directive

/**
 * Specifies the Extended Mind API
 */
trait API extends HttpService{
  
  // All valid paths
  val rootGet = path("") & get
  val authenticatePost = path("authenticate") & post
  val searchPost = path("search") & post
  val notesGet = path("notes") & get
  val noteGet = path("note" / IntNumber) & get
  val notePut = path("note" / IntNumber) & put
  val tasksGet = path("tasks") & get
  val taskGet = path("task" / IntNumber) & get
  val taskPut = path("task" / IntNumber) & put
  
}