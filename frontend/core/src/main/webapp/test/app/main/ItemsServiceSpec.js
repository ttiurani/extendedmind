/* global module, describe, inject, beforeEach, afterEach, it, expect, spyOn, getJSONFixture */
'use strict';

describe('ItemsService', function() {

  // INJECTS 

  var $httpBackend;
  var ItemsService, BackendClientService, HttpBasicAuthenticationService, HttpClientService,
      ListsService, TagsService, TasksService, NotesService, UUIDService;

  // MOCKS
  
  var now = new Date();
  var putNewItemResponse = getJSONFixture('putItemResponse.json');
  putNewItemResponse.modified = now.getTime();
  var putExistingItemResponse = getJSONFixture('putExistingItemResponse.json');
  putExistingItemResponse.modified = now.getTime();
  var deleteItemResponse = getJSONFixture('deleteItemResponse.json');
  deleteItemResponse.result.modified = now.getTime();
  var undeleteItemResponse = getJSONFixture('undeleteItemResponse.json');
  undeleteItemResponse.modified = now.getTime();
  var putExistingTaskResponse = getJSONFixture('putExistingTaskResponse.json');
  putExistingTaskResponse.modified = now.getTime();
  var completeTaskResponse = getJSONFixture('completeTaskResponse.json');
  completeTaskResponse.result.modified = now.getTime();
  var uncompleteTaskResponse = getJSONFixture('uncompleteTaskResponse.json');
  uncompleteTaskResponse.modified = now.getTime();  

  var testOwnerUUID = '6be16f46-7b35-4b2d-b875-e13d19681e77';

  var MockUserSessionService = {
      latestModified: undefined,
      offlineEnabled: false,
      getCredentials: function () {
        return '123456789';
      },
      getActiveUUID: function () {
        return testOwnerUUID;
      },
      getLatestModified: function () {
        return this.latestModified;
      },
      setLatestModified: function (modified) {
        this.latestModified = modified;
      },
      isOfflineEnabled: function () {
        return this.offlineEnabled;
      }
    };

  // SETUP / TEARDOWN

  beforeEach(function() {
    module('em.appTest');

    module('em.services', function ($provide){
      $provide.value('UserSessionService', MockUserSessionService);
    });

    inject(function (_$httpBackend_, _ItemsService_, _BackendClientService_, _HttpBasicAuthenticationService_, _HttpClientService_,
                    _ListsService_, _TagsService_, _TasksService_, _NotesService_, _UUIDService_) {
      $httpBackend = _$httpBackend_;
      ItemsService = _ItemsService_;
      BackendClientService = _BackendClientService_;
      HttpBasicAuthenticationService = _HttpBasicAuthenticationService_;
      HttpClientService = _HttpClientService_;
      ListsService = _ListsService_;
      TagsService = _TagsService_;
      TasksService = _TasksService_;
      NotesService = _NotesService_;
      UUIDService = _UUIDService_;

      var testItemData = {
          'items': [{
              'uuid': 'f7724771-4469-488c-aabd-9db188672a9b',
              'modified': 1391278509634,
              'title': 'should I start yoga?'
            }, {
              'uuid': 'd1e764e8-3be3-4e3f-8bec-8c3f9e7843e9',
              'modified': 1391278509640,
              'title': 'remember the milk'
            }, {
              'uuid': '7a612ca2-7de0-45ad-a758-d949df37f51e',
              'modified': 1391278509745,
              'title': 'buy new shoes'
            }],
          'tasks': [{
              'uuid': '7a612ca2-7de0-45ad-a758-d949df37f51e',
              'modified': 1391278509745,
              'title': 'write essay body',
              'due': '2014-03-09',
              'relationships': {
                'parent': '07bc96d1-e8b2-49a9-9d35-1eece6263f98'
              }
            }, {
              'uuid': '7b53d509-853a-47de-992c-c572a6952629',
              'modified': 1391278509698,
              'title': 'clean closet'
            }, {
              'uuid': '9a1ce3aa-f476-43c4-845e-af59a9a33760',
              'modified': 1391278509717,
              'title': 'print tickets',
              'link': 'http://www.finnair.fi',
              'due': '2014-01-02',
              'reminder': '10:00',
              'relationships': {
                'parent': 'bf726d03-8fee-4614-8b68-f9f885938a51',
                'tags': ['1208d45b-3b8c-463e-88f3-f7ef19ce87cd']
              }
            }, {
              'uuid': '1a1ce3aa-f476-43c4-845e-af59a9a33760',
              'modified': 1391278509917,
              'title': 'buy tickets',
              'completed': 1391278509917,
              'relationships': {
                'parent': 'bf726d03-8fee-4614-8b68-f9f885938a51'
              }
            }],
          'notes': [{
              'uuid': 'a1cd149a-a287-40a0-86d9-0a14462f22d6',
              'modified': 1391627811070,
              'title': 'contexts could be used to prevent access to data'
            },{
              'uuid': 'c2cd149a-a287-40a0-86d9-0a14462f22d6',
              'modified': 1391627811050,
              'title': 'office door code',
              'content': '4321',
              'relationships': {
                'tags': ['c933e120-90e7-488b-9f15-ea2ee2887e67']
              }
            }, {
              'uuid': '848cda60-d725-40cc-b756-0b1e9fa5b7d8',
              'modified': 1391627811059,
              'title': 'notes on productivity',
              'content': '##what I\'ve learned about productivity \n ' +
                         '#focus \n' +
                         'to get things done, you need to have uninterrupted time \n' +
                         '#rhythm \n' +
                         'work in high intensity sprints of 90 minutes, then break for 15 minutes \n' +
                         '#rest \n' +
                         'without ample rest and sleep, your productivity will decline rapidly' +
                         '#tools \n' +
                         'use the best possible tools for your work \n' +
                         '#process \n' +
                         'increasing your productivity doesn\'t happen overnight',
              'relationships': {
                'parent': '0da0bff6-3bd7-4884-adba-f47fab9f270d',
                'tags': ['6350affa-1acf-4969-851a-9bf2b17806d6']
              }
            }],
          'lists': [{
              'uuid': '0da0bff6-3bd7-4884-adba-f47fab9f270d',
              'modified': 1390912600957,
              'title': 'extended mind technologies',
              'link': 'http://ext.md'
            }, {
              'uuid': 'bf726d03-8fee-4614-8b68-f9f885938a51',
              'modified': 1390912600947,
              'title': 'trip to Dublin',
              'completable': true,
              'due': '2013-10-31'
            }, {
              'uuid': '07bc96d1-e8b2-49a9-9d35-1eece6263f98',
              'modified': 1390912600983,
              'title': 'write essay on cognitive biases',
              'completable': true
          }],
          'tags': [{
              'uuid': '1208d45b-3b8c-463e-88f3-f7ef19ce87cd',
              'modified': 1391066914167,
              'title': 'home',
              'tagType': 'context'
            }, {
              'uuid': '81daf688-d34d-4551-9a24-564a5861ace9',
              'modified': 1391066914032,
              'title': 'email',
              'tagType': 'context',
              'parent': 'e1bc540a-97fe-4c9f-9a44-ffcd7a8563e8'
            }, {
              'uuid': 'c933e120-90e7-488b-9f15-ea2ee2887e67',
              'modified': 1391066914132,
              'title': 'secret',
              'tagType': 'keyword'
            }]
        };

      // Syncronize with test data
      $httpBackend.expectGET('/api/' + MockUserSessionService.getActiveUUID() + '/items')
       .respond(200, testItemData);
      ItemsService.synchronize(testOwnerUUID);
      $httpBackend.flush();
    });

    // http://stackoverflow.com/a/14381941
    var localStore = {};

    spyOn(localStorage, 'getItem').andCallFake(function(key) {
      return localStore[key];
    });
    spyOn(localStorage, 'setItem').andCallFake(function(key, value) {
      localStore[key] = value + '';
    });
    spyOn(localStorage, 'removeItem').andCallFake(function(key) {
      delete localStore[key];
    });
    spyOn(localStorage, 'clear').andCallFake(function() {
      localStore = {};
    });
  });


  afterEach(function() {
    MockUserSessionService.setLatestModified(undefined);
    MockUserSessionService.offlineEnabled = false;
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  // TESTS

  it('should syncronize new item', function () {
    var newLatestModified = now.getTime();
    var modifiedGetItemsResponse = {
      'items': [{
        'uuid': 'e7724771-4469-488c-aabd-9db188672a9b',
        'modified': newLatestModified,
        'title': 'test item'
      }]
    };
    
    $httpBackend.expectGET('/api/' + MockUserSessionService.getActiveUUID() +
                           '/items?modified=' + MockUserSessionService.getLatestModified() +
                           '&deleted=true&archived=true&completed=true')
     .respond(200, modifiedGetItemsResponse);
    ItemsService.synchronize(testOwnerUUID);
    $httpBackend.flush();

    expect(ItemsService.getItems(testOwnerUUID).length)
      .toBe(4);
    expect(TagsService.getTags(testOwnerUUID).length)
      .toBe(3);
    expect(ListsService.getLists(testOwnerUUID).length)
      .toBe(3);
    expect(TasksService.getTasks(testOwnerUUID).length)
      .toBe(3);
    expect(TasksService.getCompletedTasks(testOwnerUUID).length)
      .toBe(1);
    expect(NotesService.getNotes(testOwnerUUID).length)
      .toBe(3);

    expect(MockUserSessionService.getLatestModified())
      .toBe(newLatestModified);

    // Check that task got the right context

    expect(TasksService.getTaskByUUID('9a1ce3aa-f476-43c4-845e-af59a9a33760',testOwnerUUID)
            .relationships.context).toBe('1208d45b-3b8c-463e-88f3-f7ef19ce87cd');
  });

  it('should syncronize with empty result', function () {
    MockUserSessionService.setLatestModified(undefined);
    $httpBackend.expectGET('/api/' + MockUserSessionService.getActiveUUID() + '/items')
     .respond(200, '{}');
    ItemsService.synchronize(testOwnerUUID);
    $httpBackend.flush();

    expect(ItemsService.getItems(testOwnerUUID).length)
      .toBe(0);
    expect(TagsService.getTags(testOwnerUUID).length)
      .toBe(0);
    expect(ListsService.getLists(testOwnerUUID).length)
      .toBe(0);
    expect(TasksService.getTasks(testOwnerUUID).length)
      .toBe(0);
  });

  it('should get items', function () {
    var items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(3);
    // Items should be in modified order
    expect(items[0].title).toBe('should I start yoga?');
    expect(items[1].title).toBe('remember the milk');
    expect(items[2].title).toBe('buy new shoes');
  });

  it('should find item by uuid', function () {
    expect(ItemsService.getItemByUUID('d1e764e8-3be3-4e3f-8bec-8c3f9e7843e9', testOwnerUUID))
      .toBeDefined();
  });

  it('should not find item by unknown uuid', function () {
    expect(ItemsService.getItemByUUID('bf726d03-8fee-4614-8b68-f9f885938a50', testOwnerUUID))
      .toBeUndefined();
  });

  it('should save new item', function () {
    var testItem = {
      'title': 'test item'
    };
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(200, putNewItemResponse);
    ItemsService.saveItem(testItem, testOwnerUUID);
    $httpBackend.flush();
    expect(ItemsService.getItemByUUID(putNewItemResponse.uuid, testOwnerUUID))
      .toBeDefined();

    // Should go to the end of the array
    var items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(4);
    expect(items[3].uuid)
      .toBe(putNewItemResponse.uuid);
  });

  it('should update existing item', function () {
    var rememberTheMilk = ItemsService.getItemByUUID('d1e764e8-3be3-4e3f-8bec-8c3f9e7843e9', testOwnerUUID);
    rememberTheMilk.title = 'remember the milk!';
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item/' + rememberTheMilk.uuid, rememberTheMilk)
       .respond(200, putExistingItemResponse);
    ItemsService.saveItem(rememberTheMilk, testOwnerUUID);
    $httpBackend.flush();
    expect(ItemsService.getItemByUUID(rememberTheMilk.uuid, testOwnerUUID).modified)
      .toBe(putExistingItemResponse.modified);

    // Should move to the end of the array
    var items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(3);
    expect(items[2].uuid)
      .toBe(rememberTheMilk.uuid);
  });

  it('should delete and undelete item', function () {
    var rememberTheMilk = ItemsService.getItemByUUID('d1e764e8-3be3-4e3f-8bec-8c3f9e7843e9', testOwnerUUID);
    $httpBackend.expectDELETE('/api/' + MockUserSessionService.getActiveUUID() + '/item/' + rememberTheMilk.uuid)
       .respond(200, deleteItemResponse);
    ItemsService.deleteItem(rememberTheMilk, testOwnerUUID);
    $httpBackend.flush();
    expect(ItemsService.getItemByUUID(rememberTheMilk.uuid, testOwnerUUID))
      .toBeUndefined();

    // There should be just two left
    var items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(2);

    // Undelete the item
    $httpBackend.expectPOST('/api/' + MockUserSessionService.getActiveUUID() + '/item/' + rememberTheMilk.uuid + '/undelete')
       .respond(200, undeleteItemResponse);
    ItemsService.undeleteItem(rememberTheMilk, testOwnerUUID);
    $httpBackend.flush();
    expect(ItemsService.getItemByUUID(rememberTheMilk.uuid, testOwnerUUID).modified)
      .toBe(undeleteItemResponse.modified);

    // There should be three left with the undeleted rememberTheMilk the last
    items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(3);
    expect(items[2].uuid)
      .toBe(rememberTheMilk.uuid);
  });

  it('should convert item to task', function () {
    var rememberTheMilk = ItemsService.getItemByUUID('d1e764e8-3be3-4e3f-8bec-8c3f9e7843e9', testOwnerUUID);
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task/' + rememberTheMilk.uuid)
       .respond(200, putExistingTaskResponse);
    ItemsService.itemToTask(rememberTheMilk, testOwnerUUID);
    $httpBackend.flush();

    // There should be two left
    expect(ItemsService.getItemByUUID(rememberTheMilk.uuid, testOwnerUUID))
      .toBeUndefined();
    expect(ItemsService.getItems(testOwnerUUID).length)
      .toBe(2);

    // Tasks should have the new item
    expect(TasksService.getTaskByUUID(rememberTheMilk.uuid, testOwnerUUID))
      .toBeDefined();
    expect(TasksService.getTasks(testOwnerUUID).length)
      .toBe(4);
  });

  it('should convert item to note', function () {
    var yoga = ItemsService.getItemByUUID('f7724771-4469-488c-aabd-9db188672a9b', testOwnerUUID);
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/note/' + yoga.uuid)
       .respond(200, putExistingTaskResponse);
    ItemsService.itemToNote(yoga, testOwnerUUID);
    $httpBackend.flush();

    // There should be two left
    expect(ItemsService.getItemByUUID(yoga.uuid, testOwnerUUID))
      .toBeUndefined();
    expect(ItemsService.getItems(testOwnerUUID).length)
      .toBe(2);

    // Notes should have the new item
    expect(NotesService.getNoteByUUID(yoga.uuid, testOwnerUUID))
      .toBeDefined();
    expect(NotesService.getNotes(testOwnerUUID).length)
      .toBe(4);
  });


  it('should archive tasks alongside list', function () {
    var modified = now.getTime();
    var archiveTripToDublinResponse = {
      'archived': modified,
      'children': [{
        'uuid': '9a1ce3aa-f476-43c4-845e-af59a9a33760',
        'modified': modified
      }, {
        'uuid': '1a1ce3aa-f476-43c4-845e-af59a9a33760',
        'modified': modified
      }],
      'history': {
        'uuid': '3fab3a32-3933-4b00-bf7e-9f2f516fae5f',
        'modified': modified,
        'title': 'bf726d03-8fee-4614-8b68-f9f885938a51',
        'tagType': 'history'
      },
      'result': {
        'modified': modified
      }
    };
    var tripToDublin = ListsService.getListByUUID('bf726d03-8fee-4614-8b68-f9f885938a51', testOwnerUUID);
    $httpBackend.expectPOST('/api/' + MockUserSessionService.getActiveUUID() + '/list/' + tripToDublin.uuid + '/archive')
       .respond(200, archiveTripToDublinResponse);
    ListsService.archiveList(tripToDublin, testOwnerUUID);
    $httpBackend.flush();
    
    // The list should not be active anymore
    expect(ListsService.getListByUUID(tripToDublin.uuid, testOwnerUUID))
      .toBeUndefined();
    expect(ListsService.getLists(testOwnerUUID).length)
      .toBe(2);
    expect(ListsService.getArchivedLists(testOwnerUUID).length)
      .toBe(1);

    // TagsService should have the new generated tag
    expect(TagsService.getTagByUUID(archiveTripToDublinResponse.history.uuid, testOwnerUUID))
      .toBeDefined();

    // There should be a new archived task
    expect(TasksService.getArchivedTasks(testOwnerUUID).length)
      .toBe(2);
    expect(TasksService.getTasks(testOwnerUUID).length)
      .toBe(2);
    expect(TasksService.getCompletedTasks(testOwnerUUID).length)
      .toBe(0);
  });

  it('should handle item offline create, update, delete', function () {
    MockUserSessionService.offlineEnabled = true;

    // 1. save new item

    var testItem = {
      'title': 'test item'
    };
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.saveItem(testItem, testOwnerUUID);
    $httpBackend.flush();

    // Should go to the end of the array with a fake UUID
    var items = ItemsService.getItems(testOwnerUUID);
    var firstModified = items[3].modified;
    expect(items.length)
      .toBe(4);
    expect(UUIDService.isFakeUUID(items[3].uuid))
      .toBeTruthy();

    // 2. update item

    var updatedTestItem = {
      'uuid': testItem.uuid,
      'title': testItem.title,
      'description': 'test description'
    };
    // We're expecting to get another try at creating the item
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.saveItem(updatedTestItem, testOwnerUUID);
    $httpBackend.flush();
    expect(items.length)
      .toBe(4);
    expect(firstModified)
      .toBeLessThan(items[3].modified);

    // 3. delete item
    // We're still expecting to get another try at creating the first
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.deleteItem(updatedTestItem, testOwnerUUID);
    $httpBackend.flush();
    expect(items.length)
      .toBe(3);

    // 4. undelete item
    // We're again, still expecting to get another try at creating the first
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.undeleteItem(updatedTestItem, testOwnerUUID);
    $httpBackend.flush();
    expect(items.length)
      .toBe(4);

    // 5. synchronize items and get back online, we're expecting the delete and undelete to cancel each other

    var latestModified = now.getTime();
    MockUserSessionService.setLatestModified(latestModified);
    $httpBackend.expectGET('/api/' + MockUserSessionService.getActiveUUID() + '/items?modified=' +
                            latestModified + '&deleted=true&archived=true&completed=true')
        .respond(200, '{}');
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
        .respond(200, putNewItemResponse);
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item/' + putNewItemResponse.uuid,
                           updatedTestItem)
        .respond(200, putExistingItemResponse);
    ItemsService.synchronize(testOwnerUUID);
    $httpBackend.flush();

    // Verify that everything is right with the created item
    expect(items.length)
      .toBe(4);
    expect(UUIDService.isFakeUUID(items[3].uuid))
      .toBeFalsy();
    expect(items[3].description)
      .toBeDefined();
  });

  it('should handle task offline create, update, delete', function () {
    MockUserSessionService.offlineEnabled = true;

    // 1. save new item
    var testItem = {
      'title': 'test task'
    };
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.saveItem(testItem, testOwnerUUID);
    $httpBackend.flush();
    var items = ItemsService.getItems(testOwnerUUID);
    expect(items.length)
      .toBe(4);
    var firstModified = testItem.modified;
    
    // 2. make item into task
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    ItemsService.itemToTask(testItem, testOwnerUUID);
    $httpBackend.flush();
    expect(items.length)
      .toBe(3);
    var tasks = TasksService.getTasks(testOwnerUUID);
    expect(tasks.length)
      .toBe(4);

    // 3. update task
    var updatedTestTask = {
      'uuid': testItem.uuid,
      'title': testItem.title,
      'description': 'test description'
    };
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    TasksService.saveTask(updatedTestTask, testOwnerUUID);
    $httpBackend.flush();

    expect(tasks.length)
      .toBe(4);
    expect(firstModified)
      .toBeLessThan(tasks[3].modified);

    // 4. delete task
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    TasksService.deleteTask(updatedTestTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(3);

    // 5. undelete task
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
       .respond(404);
    TasksService.undeleteTask(updatedTestTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(4);

    // 6. synchronize items and get back online, we're expecting the delete and undelete to cancel each other
    var latestModified = now.getTime();
    MockUserSessionService.setLatestModified(latestModified);
    $httpBackend.expectGET('/api/' + MockUserSessionService.getActiveUUID() + '/items?modified=' +
                            latestModified + '&deleted=true&archived=true&completed=true')
        .respond(200, '{}');
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/item', testItem)
        .respond(200, putNewItemResponse);
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task/' + putNewItemResponse.uuid,
                           testItem)
        .respond(200, putExistingItemResponse);
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task/' + putNewItemResponse.uuid,
                           updatedTestTask)
        .respond(200, putExistingItemResponse);
    ItemsService.synchronize(testOwnerUUID);
    $httpBackend.flush();

    // Verify that everything is right with the created item
    expect(items.length)
      .toBe(3);
    expect(tasks.length)
      .toBe(4);
    expect(UUIDService.isFakeUUID(tasks[3].uuid))
      .toBeFalsy();
    expect(tasks[3].description)
      .toBeDefined();
  });

  it('should handle task offline complete, uncomplete', function () {
    MockUserSessionService.offlineEnabled = true;

    // 1. save new task
    var testTask = {
      'title': 'test task'
    };
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task', testTask)
       .respond(404);
    TasksService.saveTask(testTask, testOwnerUUID);
    $httpBackend.flush();
    var tasks = TasksService.getTasks(testOwnerUUID);
    var completedTasks = TasksService.getCompletedTasks(testOwnerUUID);
    expect(tasks.length)
      .toBe(4);
    expect(completedTasks.length)
      .toBe(1);

    // 2. complete it
    
    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task', testTask)
       .respond(404);
    TasksService.completeTask(testTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(4);
    expect(completedTasks.length)
      .toBe(2);

    // 3. uncomplete it

    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task', testTask)
       .respond(404);
    TasksService.uncompleteTask(testTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(4);
    expect(completedTasks.length)
      .toBe(1);

    // 4. complete it again but go online, expect only one complete

    $httpBackend.expectPUT('/api/' + MockUserSessionService.getActiveUUID() + '/task', testTask)
       .respond(200, putNewItemResponse);
    $httpBackend.expectPOST('/api/' + MockUserSessionService.getActiveUUID() + '/task/' + putNewItemResponse.uuid + '/complete')
       .respond(200, completeTaskResponse);       
    TasksService.completeTask(testTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(4);
    expect(completedTasks.length)
      .toBe(2);

    // 5. uncomplete online

    $httpBackend.expectPOST('/api/' + MockUserSessionService.getActiveUUID() + '/task/' + putNewItemResponse.uuid + '/uncomplete')
       .respond(200, uncompleteTaskResponse);       
    TasksService.uncompleteTask(testTask, testOwnerUUID);
    $httpBackend.flush();
    expect(tasks.length)
      .toBe(4);
    expect(completedTasks.length)
      .toBe(1);
  });


});
