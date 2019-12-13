'use strict';

angular.module('wcagReporter')
  .controller('AuditCriteriaCtrl', function (
    $scope,
    evalAuditModel,
    evalScopeModel,
    wcag2spec,
    $rootElement,
    $anchorScroll,
    $filter,
    $rootScope,
    $timeout
  ) {
    var principlesOrigin = [];
    var activeFilters = [];

    $scope.criteria = evalAuditModel.getCriteriaSorted();

    $scope.getCritAssert = evalAuditModel.getCritAssert;

    function buildPrinciples (target, origin) {
      var tgtPrinciple = origin[target.length];
      target.push(tgtPrinciple);

      // tgtPrinciple.guidelines.forEach(function (g) {
      //     g.hideCriteria = true;
      // });

      if (target.length !== origin.length) {
        $timeout(function () {
          buildPrinciples(target, origin);
        }, 50);
      }
    }

    function getActiveFilters () {
      var filters = $scope.critFilter;
      var activatedFilters = [];

      for (var filter in filters) {
        if (Object.prototype.hasOwnProperty.call($scope.critFilter, filter)) {
          for (var filterOption in filters[filter]) {
            if (
              Object.prototype.hasOwnProperty.call(filters[filter], filterOption) &&
              filters[filter][filterOption] === true
            ) {
              activatedFilters.push(filterOption);
            }
          }
        }
      }

      return activatedFilters.slice();
    }

    function setActiveFilters () {
      activeFilters = getActiveFilters();
    }

    function enabledFilter (filter) {
      var filters = $scope.critFilter;

      if (Object.prototype.hasOwnProperty.call(filters, filter)) {
        for (var filterOption in filters[filter]) {
          if (
            Object.prototype.hasOwnProperty.call(filters[filter], filterOption) &&
            filters[filter][filterOption] === true
          ) {
            return true;
          }
        }
      }

      return false;
    }

    function criterionMatchFilter (criterion) {
      var versionActive = (activeFilters.indexOf(criterion.versions[0]) !== -1);
      var levelActive = (activeFilters.indexOf(criterion.level) !== -1);

      if (
        versionActive &&
        levelActive
      ) {
        return true;
      }

      if (
        versionActive &&
        !enabledFilter('levels')
      ) {
        return true;
      }

      if (
        levelActive &&
        !enabledFilter('versions')
      ) {
        return true;
      }

      return false;
    }

    $scope.principles = [];

    if (wcag2spec.isLoaded()) {
      principlesOrigin = wcag2spec.getPrinciples();
      buildPrinciples($scope.principles, principlesOrigin);
    }

    $scope.$on('wcag2spec:langChange', function () {
      principlesOrigin = wcag2spec.getPrinciples();
      $scope.principles = [];
      buildPrinciples($scope.principles, principlesOrigin);
    });

    $scope.$watch(
      function (scope) {
        var setFilters = activeFilters = getActiveFilters();
        return setFilters.length;
      },
      function (next, current, scope) {
        if (next !== current) {
          setActiveFilters();
        }
      }
    );

    if ($rootScope.rootHide.criteria) {
      $scope.critFilter = $rootScope.rootHide.criteria;
    } else {
      $scope.critFilter = {
        count: 5,
        versions: {
          WCAG21: evalScopeModel.wcagVersion === 'WCAG21',
          WCAG20: true
        },
        levels: {
          'wai:WCAG2A-Conformance': evalScopeModel.matchConformTarget('wai:WCAG2A-Conformance'),
          'wai:WCAG2AA-Conformance': evalScopeModel.matchConformTarget('wai:WCAG2AA-Conformance'),
          'wai:WCAG2AAA-Conformance': evalScopeModel.matchConformTarget('wai:WCAG2AAA-Conformance')
        }
      };
      $rootScope.rootHide.criteria = $scope.critFilter;
    }

    $scope.isCriterionVisible = function (critSpec) {
      // Quick filtering all or none is visible
      if (
        activeFilters.length === 0 ||
        activeFilters.length === $scope.critFilter.count
      ) {
        return true;
      }

      // Check if the level of this criterion should be shown
      if (!criterionMatchFilter(critSpec)) {
        return false;
      }

      // Check if the assert has an outcome, if no, don't show the criterion
      var critAssert = evalAuditModel.getCritAssert(critSpec.id);
      if (
        typeof critAssert !== 'object' ||
        typeof critAssert.result !== 'object'
      ) {
        return false;
      }

      // Check if the outcome is set to hidden
      return true;
    };

    $scope.isGuidelineVisible = function (guideline) {
      return guideline.successcriteria.some(function (criterion) {
        return $scope.isCriterionVisible(criterion);
      });
    };

    $scope.isPrincipleVisible = function (principle) {
      return principle.guidelines.some(function (guideline) {
        return $scope.isGuidelineVisible(guideline);
      });
    };

    var untested = [
      'earl:untested',
      'earl:cantTell'
    ];
    $scope.criteriaUntested = function (guideline) {
      var count = 0;
      guideline.successcriteria.forEach(function (critSpec) {
        var critAssert = evalAuditModel.getCritAssert(critSpec.id);
        if (untested.indexOf(critAssert.result.outcome) !== -1) {
          count += 1;
        }
      });
      return count;
    };

    // Scroll to the top, then move focus to the h1
    $scope.toTop = function () {
      $('html, body')
        .animate({
          scrollTop: $rootElement.offset().top
        }, 200, $rootElement.focusH1);
    };
  });
