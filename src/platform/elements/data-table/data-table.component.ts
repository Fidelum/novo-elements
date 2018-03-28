import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  ViewChild,
  EventEmitter,
  AfterContentInit,
  ChangeDetectorRef,
  OnDestroy,
  ContentChildren,
  QueryList,
  ViewChildren,
  TemplateRef,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { CDK_TABLE_TEMPLATE, CdkTable } from '@angular/cdk/table';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subscription } from 'rxjs/Subscription';

import { NovoDataTableSelection } from './selection/data-table-selection.directive';
import { NovoDataTableSortFilter } from './sort-filter/sort-filter.directive';
import { NovoDataTablePagination } from './pagination/data-table-pagination.component';
import { IDataTableColumn, IDataTablePaginationOptions, IDataTableSearchOptions, IDataTableService } from './interfaces';
import { DataTableSource } from './data-table.source';
import { NovoLabelService } from '../../services/novo-label-service';
import { DataTableState } from './state/data-table-state.service';
import { NovoTemplate } from '../common/novo-template/novo-template.directive';
import { Helpers } from '../../utils/Helpers';
import { StaticDataTableService } from './services/static-data-table.service';

@Component({
  selector: 'novo-data-table',
  template: `
        <header *ngIf="(!(dataSource?.totallyEmpty && !state.userFiltered) && !loading) || forceShowHeader">
          <ng-container *ngTemplateOutlet="templates['customHeader']"></ng-container>
            <novo-search
                alwaysOpen="true"
                (searchChanged)="onSearchChange($event)"
                [(ngModel)]="state.globalSearch"
                *ngIf="!hideGlobalSearch"
                [placeholder]="searchOptions?.placeholder"
                [hint]="searchOptions?.tooltip">
            </novo-search>
            <novo-data-table-pagination
                *ngIf="paginationOptions"
                [theme]="paginationOptions.theme"
                [length]="dataSource?.total"
                [page]="paginationOptions.page"
                [pageSize]="paginationOptions.pageSize"
                [pageSizeOptions]="paginationOptions.pageSizeOptions">
            </novo-data-table-pagination>
            <div class="novo-data-table-actions" *ngIf="templates['customActions']">
              <ng-container *ngTemplateOutlet="templates['customActions']"></ng-container>
            </div>
        </header>
        <div class="novo-data-table-loading-mask" *ngIf="dataSource?.loading || loading" data-automation-id="novo-data-table-loading">
            <novo-loading></novo-loading>
        </div>
        <div class="novo-data-table-outside-container">
            <div class="novo-data-table-custom-filter" *ngIf="customFilter">
              <ng-container *ngTemplateOutlet="templates['customFiler']"></ng-container>
            </div>
            <div class="novo-data-table-container" [class.empty-user-filtered]="dataSource?.currentlyEmpty && state.userFiltered" [class.empty]="dataSource?.totallyEmpty && !dataSource?.loading && !loading && !state.userFiltered && !dataSource.pristine">
                <cdk-table *ngIf="(columns?.length > 0) && columnsLoaded && dataSource" [dataSource]="dataSource" [trackBy]="trackByFn" novoDataTableSortFilter novoDataTableSelection [class.empty]="dataSource?.currentlyEmpty && state.userFiltered" [hidden]="dataSource?.totallyEmpty && !userFiltered">
                    <ng-container novoDataTableColumnDef="selection">
                        <novo-data-table-checkbox-header-cell *novoDataTableHeaderCellDef></novo-data-table-checkbox-header-cell>
                        <novo-data-table-checkbox-cell *novoDataTableCellDef="let row; let i = index" [row]="row" [index]="i"></novo-data-table-checkbox-cell>
                    </ng-container>
                    <ng-container *ngFor="let column of columns;trackBy: trackColumnsBy" [novoDataTableColumnDef]="column.id">
                      <novo-data-table-header-cell *novoDataTableHeaderCellDef [column]="column" [novo-data-table-cell-config]="column" [defaultSort]="defaultSort" [class.empty]="column?.type === 'action' && !column?.label" [class.button-header-cell]="column?.type === 'action' && !column?.action?.options" [class.dropdown-header-cell]="column?.type === 'action' && column?.action?.options"></novo-data-table-header-cell>
                      <novo-data-table-cell *novoDataTableCellDef="let row" [column]="column" [row]="row" [template]="columnToTemplate[column.id]" [class.empty]="column?.type === 'action' && !column?.label" [class.button-cell]="column?.type === 'action' && !column?.action?.options" [class.dropdown-cell]="column?.type === 'action' && column?.action?.options"></novo-data-table-cell>
                    </ng-container>
                    <novo-data-table-header-row *novoDataTableHeaderRowDef="displayedColumns" data-automation-id="novo-data-table-header-row"></novo-data-table-header-row>
                    <novo-data-table-row *novoDataTableRowDef="let row; columns: displayedColumns;" [id]="name + '-' + row[rowIdentifier]" [dataAutomationId]="'data-automation-id-' + row[rowIdentifier]"></novo-data-table-row>
                </cdk-table>
                <div class="novo-data-table-no-results-container" *ngIf="dataSource?.currentlyEmpty && state.userFiltered && !dataSource?.loading && !loading && !dataSource.pristine">
                  <div class="novo-data-table-empty-message" >
                    <ng-container *ngTemplateOutlet="templates['noResultsMessage'] || templates['defaultNoResultsMessage']"></ng-container>
                  </div>
                </div>
            </div>
            <div class="novo-data-table-empty-container" *ngIf="dataSource?.totallyEmpty && !dataSource?.loading && !loading && !state.userFiltered && !dataSource.pristine">
              <div class="novo-data-table-empty-message">
                <ng-container *ngTemplateOutlet="templates['emptyMessage'] || templates['defaultNoResultsMessage']"></ng-container>
              </div>
            </div>
        </div>

         <!-- DEFAULT CELL TEMPLATE -->
        <ng-template novoTemplate="stringCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col }}</span>
        </ng-template>
        <ng-template novoTemplate="dateCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col | dataTableDateRenderer:col }}</span>
        </ng-template>
        <ng-template novoTemplate="datetimeCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col | dataTableDateTimeRenderer:col }}</span>
        </ng-template>
        <ng-template novoTemplate="timeCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col | dataTableTimeRenderer:col }}</span>
        </ng-template>
        <ng-template novoTemplate="currencyCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col | dataTableCurrencyRenderer:col }}</span>
        </ng-template>
        <ng-template novoTemplate="numberCellTemplate"
              let-row
              let-col="col">
              <span>{{ row[col.id] | dataTableInterpolate:col | dataTableNumberRenderer:col }}</span>
        </ng-template>
        <ng-template novoTemplate="linkCellTemplate"
              let-row
              let-col="col">
              <a (click)="col.handlers?.click({originalEvent: $event, row: row})">{{ row[col.id] | dataTableInterpolate:col }}</a>
        </ng-template>
        <ng-template novoTemplate="buttonCellTemplate"
              let-row
              let-col="col">
              <i class="bhi-{{ col?.action?.icon }} data-table-icon" (click)="col.handlers?.click({ originalEvent: $event, row: row })" [class.disabled]="isDisabled(col, row)"></i>
        </ng-template>
        <ng-template novoTemplate="dropdownCellTemplate"
              let-row
              let-col="col">
              <novo-dropdown appendToBody="true" parentScrollSelector=".novo-data-table" containerClass="novo-data-table-dropdown">
                <button type="button" theme="dialogue" icon="collapse" inverse>{{ col.label }}</button>
                <list>
                    <item *ngFor="let option of col?.action?.options" (action)="option.handlers.click({ originalEvent: $event?.originalEvent, row: row })" [disabled]="isDisabled(option, row)">
                        <span [attr.data-automation-id]="option.label">{{ option.label }}</span>
                    </item>
                </list>
            </novo-dropdown>
        </ng-template>
        <ng-template novoTemplate="defaultNoResultsMessage">
            <h4><i class="bhi-search-question"></i> {{ labels.noMatchingRecordsMessage }}</h4>
        </ng-template>
        <ng-template novoTemplate="defaultEmptyMessage">
          <h4><i class="bhi-search-question"></i> {{ labels.emptyTableMessage }}</h4>
        </ng-template>
        <!-- CUSTOM CELLS PASSED IN -->
        <ng-content></ng-content>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DataTableState],
})
export class NovoDataTable<T> implements AfterContentInit, OnDestroy {
  @HostBinding('class.global-search-hidden') globalSearchHiddenClassToggle: boolean = false;

  @ContentChildren(NovoTemplate) customTemplates: QueryList<NovoTemplate>;
  @ViewChildren(NovoTemplate) defaultTemplates: QueryList<NovoTemplate>;

  @Input() displayedColumns: string[];
  @Input() paginationOptions: IDataTablePaginationOptions;
  @Input() searchOptions: IDataTableSearchOptions;
  @Input() defaultSort: { id: string; value: string };
  @Input() name: string = 'novo-data-table';
  @Input() rowIdentifier: string = 'id';
  @Input() trackByFn: Function = (index, item) => item.id;

  @Input()
  set dataTableService(service: IDataTableService<T>) {
    this.loading = false;
    if (!service) {
      service = new StaticDataTableService([]);
    }
    this.dataSource = new DataTableSource<T>(service, this.state, this.ref);
    this.ref.detectChanges();
  }

  @Input()
  set rows(rows: T[]) {
    this.loading = false;
    let service = new StaticDataTableService(rows);
    this.dataSource = new DataTableSource<T>(service, this.state, this.ref);
    this.ref.detectChanges();
  }

  @Input()
  set outsideFilter(outsideFilter: EventEmitter<any>) {
    // Unsubscribe
    if (this.outsideFilterSubscription) {
      this.outsideFilterSubscription.unsubscribe();
    }
    // Re-subscribe
    this.outsideFilterSubscription = outsideFilter.subscribe((filter: any) => {
      this.state.outsideFilter = filter;
      this.state.updates.next({ globalSearch: this.state.globalSearch, filter: this.state.filter, sort: this.state.sort });
      this.ref.markForCheck();
    });
  }

  @Input()
  set columns(columns: IDataTableColumn<T>[]) {
    this._columns = columns;
    this.configureColumns();
  }
  get columns(): IDataTableColumn<T>[] {
    return this._columns;
  }

  @Input()
  set customFilter(v: boolean) {
    this._customFilter = coerceBooleanProperty(v);
  }
  get customFilter() {
    return this._customFilter;
  }
  private _customFilter: boolean;

  @Input()
  set forceShowHeader(v: boolean) {
    this._forceShowHeader = coerceBooleanProperty(v);
  }
  get forceShowHeader() {
    return this._forceShowHeader;
  }
  private _forceShowHeader: boolean;

  @Input()
  set hideGlobalSearch(v: boolean) {
    this._hideGlobalSearch = coerceBooleanProperty(v);
    this.globalSearchHiddenClassToggle = this._hideGlobalSearch;
  }
  get hideGlobalSearch() {
    return this._hideGlobalSearch;
  }
  private _hideGlobalSearch: boolean = true;

  public dataSource: DataTableSource<T>;
  public loading: boolean = true;
  public templates: { [key: string]: TemplateRef<any> } = {};
  public columnToTemplate: { [key: string]: TemplateRef<any> } = {};
  public columnsLoaded: boolean = false;

  private outsideFilterSubscription: Subscription;
  private _columns: IDataTableColumn<T>[];

  @HostBinding('class.empty')
  get empty() {
    return this.dataSource && this.dataSource.totallyEmpty;
  }

  @HostBinding('class.loading')
  get loadingClass() {
    return this.loading || (this.dataSource && this.dataSource.loading);
  }

  constructor(public labels: NovoLabelService, private ref: ChangeDetectorRef, public state: DataTableState) {}

  public ngOnDestroy(): void {
    if (this.outsideFilterSubscription) {
      this.outsideFilterSubscription.unsubscribe();
    }
  }

  public ngAfterContentInit(): void {
    // Default templates defined here
    this.defaultTemplates.forEach((item) => {
      this.templates[item.getType()] = item.template;
    });
    // Custom templates passed in
    this.customTemplates.forEach((item) => {
      this.templates[item.getType()] = item.template;
    });
    // Load columns
    this.configureColumns();

    if (this.paginationOptions && !this.paginationOptions.page) {
      this.paginationOptions.page = 0;
    }
    if (this.paginationOptions && !this.paginationOptions.pageSize) {
      this.paginationOptions.pageSize = 50;
    }
    if (this.paginationOptions && !this.paginationOptions.pageSizeOptions) {
      this.paginationOptions.pageSizeOptions = [10, 25, 50, 100];
    }
    this.state.page = this.paginationOptions ? this.paginationOptions.page : undefined;
    this.state.pageSize = this.paginationOptions ? this.paginationOptions.pageSize : undefined;
    this.ref.markForCheck();
  }

  public onSearchChange(term: string): void {
    this.state.globalSearch = term;
    this.state.reset(false, true);
    this.state.updates.next({ globalSearch: term, filter: this.state.filter, sort: this.state.sort });
  }

  public trackColumnsBy(index: number, item: IDataTableColumn<T>) {
    return item.id;
  }

  public isDisabled(check: any, row: T): boolean {
    if (check.disabled === true) {
      return true;
    }
    if (check.disabledFunc) {
      return check.disabledFunc(row);
    }
    return false;
  }

  private configureColumns(): void {
    if (this.columns && this.columns.length !== 0 && Object.keys(this.templates).length !== 0) {
      // Figure the column templates
      this.columns.forEach((column: IDataTableColumn<T>) => {
        // Figure the template
        let templateName: string;
        if (column.template) {
          // Pass it in as template
          templateName = column.template;
        } else if (!!this.templates[column.id]) {
          // Custom template for the column id
          templateName = column.id;
        } else {
          // Default to the defaulCellTemplate
          if (column.type === 'action') {
            if (column.action && column.action.options) {
              templateName = 'dropdownCellTemplate';
            } else {
              templateName = 'buttonCellTemplate';
            }
          } else {
            templateName = `${column.type}CellTemplate`;
          }
        }
        this.columnToTemplate[column.id] = this.templates[templateName];
      });
      this.columnsLoaded = true;
    }
  }
}