/**
*  Service that provides functionalities to edit nodes in a topology.
*/
define(function (require) {
  'use strict';
  var modules = require('modules');
  var angular = require('angular');
  var _ = require('lodash');

  modules.get('a4c-topology-editor').factory('topoEditNodes', ['toscaService', '$filter', '$modal', '$translate',
    function(toscaService, $filter, $modal, $translate) {
      var nodeNamePattern = '^\\w+$';

      var TopologyEditorMixin = function(scope) {
        this.scope = scope;
      };

      TopologyEditorMixin.prototype = {
        constructor: TopologyEditorMixin,
        /** Init method is called when the controller is ready. */
        init: function() {},
        /** Method triggered as a result of a on-drag (see drag and drop directive and node type search directive). */
        onDragged: function(e) {
          var nodeType = angular.fromJson(e.source);

          // // compare the type version with the existing version if exist
          // // if different, display a popup to notify the user
          // var versionDiffers = false;
          // var dependencyVersion = undefined;
          // for (var i = 0; i < this.scope.topology.topology.dependencies.length && !versionDiffers; i++) {
          //   var dep = this.scope.topology.topology.dependencies[i];
          //   if (dep.name === nodeType.archiveName && dep.version !== nodeType.archiveVersion) {
          //     versionDiffers = true;
          //     dependencyVersion = dep.version;
          //   }
          // }
          // if (versionDiffers) {
          //   var ModalInstanceCtrl = ['$scope', '$modalInstance', 'title', 'content', function($scope, $modalInstance, title, content) {
          //     $scope.title = title;
          //     $scope.content = content;
          //     $scope.close = function() {
          //       $modalInstance.dismiss('close');
          //     };
          //   }];
          //   $modal.open({
          //     templateUrl: 'views/common/simple_modal.html',
          //     controller: ModalInstanceCtrl,
          //     resolve: {
          //       title: function() {
          //         return $translate.instant('APPLICATIONS.TOPOLOGY.DEPENDENCIES.INCOMPATIBLE_VERSIONS.TITLE');
          //       },
          //       content: function() {
          //         return $translate.instant('APPLICATIONS.TOPOLOGY.DEPENDENCIES.INCOMPATIBLE_VERSIONS.CONTENT', {
          //           archiveName : nodeType.archiveName,
          //           archiveVersion : dependencyVersion
          //         });
          //       }
          //     }
          //   });
          //   return;
          // }
          // find if the node type has been dragged on another node template (so we can generate hosted on relationship).
          var evt = e.event;
          var hostNodeName = null;
          if (evt.target.hasAttribute('node-template-id')) {
            hostNodeName = evt.target.getAttribute('node-template-id');
          }
          this.add(nodeType, hostNodeName);
        },
        /** this has to be exposed to the scope as we cannot rely on drag and drop callbacks for ui tests */
        add: function(nodeType, hostNodeName) {
          var nodeTemplName = toscaService.generateNodeTemplateName(nodeType.elementId, this.scope.topology.topology.nodeTemplates);
          this.doAddNodeTemplate(nodeTemplName, nodeType, hostNodeName);
        },
        /** Actually trigger the node template addition. */
        doAddNodeTemplate: function(nodeTemplateName, selectedNodeType, targetNodeTemplateName) {
          var scope = this.scope;
          scope.execute({
            type: 'org.alien4cloud.tosca.editor.operations.nodetemplate.AddNodeOperation',
            nodeName: nodeTemplateName,
            indexedNodeTypeId: selectedNodeType.id
          }, function(result) {
            if (_.undefined(result.error) && targetNodeTemplateName) {
              // drag a node on another node
              scope.relationships.autoOpenRelationshipModal(nodeTemplateName, targetNodeTemplateName);
            }
          }, null, nodeTemplateName);
        },
        /* Update node template name */
        updateName: function(newName) {
          var scope = this.scope;
          // Update only when the name has changed
          scope.nodeTempNameEditError = null;

          if (!newName.match(nodeNamePattern)) {
            return $filter('translate')('APPLICATIONS.TOPOLOGY.INVALID_NODE_NAME');
          }

          if (scope.selectedNodeTemplate.name !== newName) {
            scope.execute({
                type: 'org.alien4cloud.tosca.editor.operations.nodetemplate.RenameNodeOperation',
                nodeName: scope.selectedNodeTemplate.name,
                newName: newName
              }, null,
              function() { // error handling
                scope.nodeNameObj.val = scope.selectedNodeTemplate.name;
              }, scope.selectedNodeTemplate ? newName : undefined
            );
          } // if end
          scope.display.set('nodetemplate', true);
        },
        delete: function(nodeTemplName) {
          var scope = this.scope;
          scope.execute({
              type: 'org.alien4cloud.tosca.editor.operations.nodetemplate.DeleteNodeOperation',
              nodeName: nodeTemplName,
            },
            function(){ scope.display.displayOnly(['topology']); }
          );
        },
        /* Update properties of a node template */
        updateProperty: function(propertyDefinition, propertyName, propertyValue) {
          var scope = this.scope;

          var updatedNodeTemplate = scope.selectedNodeTemplate;
          return scope.execute({
              type: 'org.alien4cloud.tosca.editor.operations.nodetemplate.UpdateNodePropertyValueOperation',
              nodeName: scope.selectedNodeTemplate.name,
              propertyName: propertyName,
              propertyValue: propertyValue
            },
            function(result){
              if (_.undefined(result.error)) {
                updatedNodeTemplate.propertiesMap[propertyName].value = {value: propertyValue, definition: false};
              }
            },
            null,
            scope.selectedNodeTemplate.name,
            true
          );
        }
      };

      return function(scope) {
        var instance = new TopologyEditorMixin(scope);
        scope.nodes = instance;
      };
    }
  ]); // modules
}); // define
