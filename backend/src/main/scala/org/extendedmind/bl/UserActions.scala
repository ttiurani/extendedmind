package org.extendedmind.bl

import org.extendedmind.domain.User
import org.extendedmind.domain.GraphDatabase
import org.extendedmind.Settings
import scaldi.Injector
import scaldi.Injectable
import org.extendedmind.domain.EmbeddedGraphDatabase

trait UserActions{

  def db: GraphDatabase;
  def si: SearchIndex;
  
  def addUser(user: User): User = {
    val persisted = db.addUser(user)
    si.addUser(user)
    persisted
  }
  
  def getUsers(): List[User] = {
    db.getUsers()  
  }
}

class UserActionsImpl(settings: Settings)(implicit val inj: Injector) 
		extends UserActions with Injectable{
  def db = inject[GraphDatabase] (by default new EmbeddedGraphDatabase(settings))
  def si = inject[SearchIndex] (by default new ElasticSearchIndex(settings))
}
