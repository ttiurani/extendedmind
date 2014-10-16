/* Copyright 2013-2014 Extended Mind Technologies Oy
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 'use strict';

 function tasksByDate(DateService) {
  return function(tasks, date, passthrough) {
    // Return unfiltered task.
    if (passthrough) {
      return tasks;
    }

    var filteredItems = [];

    // Tasks with 'no date'.
    if (date === null) {
      for (var i = 0, len = tasks.length; i < len; i++) {
        if (!tasks[i].due) filteredItems.push(tasks[i]);
      }
      return filteredItems;
    }

    var today = DateService.getTodayYYYYMMDD();
    for (var k = 0, kLen = tasks.length; k < kLen; k++) {
      if (tasks[k].due) {
        // match tasks with given date, or if date is today match also overdue tasks
        if (tasks[k].due === date || (date === today && tasks[k].due < today)) filteredItems.push(tasks[k]);
      }
    }
    return filteredItems;
  };
}
angular.module('em.tasks').filter('tasksByDate', tasksByDate);
