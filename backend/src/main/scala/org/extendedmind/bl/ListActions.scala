package org.extendedmind.bl

import org.extendedmind.domain._
import org.extendedmind.db._
import scaldi.Injector
import scaldi.Injectable
import org.extendedmind.domain.Item
import java.util.UUID
import org.extendedmind._
import org.extendedmind.Response._
import spray.util.LoggingContext

trait ListActions {

  def db: GraphDatabase;
  
  def getList(owner: Owner, listUUID: UUID)(implicit log: LoggingContext): Response[List] = {
    log.info("getTask: owner {}, list {}", owner, listUUID)
    db.getList(owner, listUUID)
  }

  def putNewList(owner: Owner, list: List)(implicit log: LoggingContext): Response[SetResult] = {
    log.info("putNewList: owner {}", owner)
    db.putNewList(owner, list)
  }
/*
  def putExistingTask(owner: Owner, taskUUID: UUID, task: Task)(implicit log: LoggingContext): Response[SetResult] = {
    log.info("putExistingTask: owner {}, task {}", owner, taskUUID)
    db.putExistingTask(owner, taskUUID, task)
  }
  
  def deleteTask(owner: Owner, taskUUID: UUID)(implicit log: LoggingContext): Response[DeleteItemResult] = {
    log.info("deleteTask: owner {}, task {}", owner, taskUUID)
    db.deleteTask(owner, taskUUID)
  }
  
  def undeleteTask(owner: Owner, taskUUID: UUID)(implicit log: LoggingContext): Response[SetResult] = {
    log.info("undeleteTask: owner {}, task {}", owner, taskUUID)
    db.undeleteItem(owner: Owner, taskUUID, Some(ItemLabel.TASK))
  }

  def completeTask(owner: Owner, taskUUID: UUID)(implicit log: LoggingContext): Response[CompleteTaskResult] = {
    log.info("completeTask: owner {}, task {}", owner, taskUUID)
    db.completeTask(owner, taskUUID)
  }
  
  def uncompleteTask(owner: Owner, taskUUID: UUID)(implicit log: LoggingContext): Response[SetResult] = {
    log.info("uncompleteTask: owner {}, task {}", owner, taskUUID)
    db.uncompleteTask(owner, taskUUID)
  }
*/
}

class ListActionsImpl(implicit val settings: Settings, implicit val inj: Injector)
  extends ListActions with Injectable {
  def db = inject[GraphDatabase]
}
