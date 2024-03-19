import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation,  } from '@angular/core';
import { SelectionModel, DataSource } from '@angular/cdk/collections';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { OptionsList, CommonService, AnnouncementService } from 'app/_services';
import { merge, Subject, Observable, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map,first } from 'rxjs/operators';
import { CommonUtils } from 'app/_helpers';
import { FormGroup, FormBuilder } from '@angular/forms';
import { FuseConfirmDialogComponent } from '@fuse/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute} from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { Home } from 'app/_models';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-common',
  templateUrl: './common.component.html',
  styleUrls: ['./common.component.scss'],
  animations    : fuseAnimations,
  encapsulation : ViewEncapsulation.None
})
export class CommonComponent implements OnInit {

  public title        : string = ''; 
  public RoleList     : any = {};
  public StatusList   : any;
  public displayedColumns: string[];
  public removeButton : boolean = true;
  public pathmath     :boolean =  false;
  public trash        : boolean = false;
  public defaultDateTimeFormat: any = {date_format:'MM/dd/yyyy',time_format:"h:mm a"};
  confirmDialogRef    : MatDialogRef<FuseConfirmDialogComponent>; //EXTRA Changes  
  filterForm          : FormGroup;
  PaginationOpt: any = {}; //pagination size,page options
  Columns: []; 
  dataSource: FilesDataSource | null;
  selection = new SelectionModel<Home>(true, []);
  filterParams:any = {};
  @ViewChild('table', {static: true}) table: MatTable<any>;
  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;

  @ViewChild('filter', {static: true})
  filter: ElementRef;

  // Private
  private _unsubscribeAll: Subject<any>;


  /**
   * Constructor
   *
   * @param {FormBuilder} _formBuilder
   * @param {MatSnackBar} _matSnackBar
   */
  constructor(
      private _announceService: AnnouncementService,
      private _formBuilder    : FormBuilder,
      public _matDialog       : MatDialog,
      private _matSnackBar    : MatSnackBar,
      private _commonService  : CommonService,
      private route           : ActivatedRoute
  )
  {
      // Set the private defaults
      this._unsubscribeAll = new Subject();
      if(this.route.routeConfig.path=="admin/announcement/event/trash")
      {   
          this.title = " Event Announcement Trash List";
          this.trash = true;
          this.removeButton = false;
          this.pathmath= false;
      }
      else
      { 
        if(this.route.routeConfig.path=="admin/announcement/dining/trash"){
          this.title = " Dining Announcement Trash List";
          this.trash = true;
          this.removeButton = false;
          this.pathmath= true;
        }
     
          
        if(this.route.routeConfig.path == "admin/announcement/dining")
        {
          this.title = " Dining Announcement";
          this.pathmath= true;
        }else{
          this.title = " Event Announcement";
          
        }
      }

         
      
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
  */
  ngOnInit(): void
  {
      //Pagination Options
      this.PaginationOpt    = OptionsList.Options.tables.pagination.options;  
      this.StatusList       = OptionsList.Options.tables.status.users;
      this.Columns          = OptionsList.Options.tables.list.announcement;
      this.displayedColumns = OptionsList.Options.tables.list.announcement.map(col => col.columnDef);
      this.dataSource       = new FilesDataSource(this._announceService, this.paginator, this.sort);
      //!this.selection.selected.length ? this.hasSelectedContacts==true : this.hasSelectedContacts==false;
      //Declare Filter Form
      this.filterForm = this._formBuilder.group({
          searchKey   : [''],
          roles       : [''],
          status      : [''],
          trash       : ['']
      });
      this.resetPageIndex(); //#Reset PageIndex of form if search changes
      
      merge(this.sort.sortChange,this.paginator.page,this.filterForm.valueChanges)
      .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(500),
          distinctUntilChanged()
      )
      .subscribe(res=>{
        
          if(this.route.routeConfig.path == "admin/announcement/event"){
            this.selection.clear();
            this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
            this.trash==true ? this.filterParams['content_type'] = "event-announcement": this.filterParams['content_type'] = "event-announcement";
            this.trash==true ? this.filterParams['trash'] = 1 : '';
            this.filterParams['column']        = 'order';
            this.filterParams['direction']     = 'asc';
            this.dataSource.getFilteredAnnouncement(this.filterParams);
          }else{
            this.selection.clear();
            this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
            this.trash==true ? this.filterParams['content_type'] = "dining-announcement": this.filterParams['content_type'] = "dining-announcement";
            this.trash==true ? this.filterParams['trash'] = 1 : '';
            this.filterParams['column']        = 'order';
            this.filterParams['direction']     = 'asc';
            this.dataSource.getFilteredAnnouncement(this.filterParams);
          }
      });

       //Deault DateTime Formats
       this.defaultDateTimeFormat = this._commonService.getDefaultDateTimeFormat;
  }
  //Reset PageIndex On Form Changes
  resetPageIndex(){
      this.filterForm.valueChanges.subscribe(data=>{
          this.paginator.pageIndex = 0;
      });
  }
  
  isAllSelected() {
      const numSelected   = this.selection.selected.length;
      const numRows       = this.dataSource.filteredData.data.length;
      return numSelected === numRows;
  }
  masterToggle() {
      this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.filteredData.data.forEach(row => this.selection.select(row.content_id));
  }
  deselectAll(){
      this.selection.clear();
  }
  
  deleteAll() 
  {
      this.deleteItem(this.selection.selected);
  }
  /**ACTION FUNCTIONS */
  deleteItem(id){
      this.confirmDialogRef = this._matDialog.open(FuseConfirmDialogComponent, {
          disableClose: false
      });
      if(this.route.routeConfig.path=="admin/announcement/dining/trash" ||  this.route.routeConfig.path=="admin/announcement/event/trash"){
      this.confirmDialogRef.componentInstance.confirmMessage = 'Are you sure you want to delete selected announcement?';
      }else{
        this.confirmDialogRef.componentInstance.confirmMessage = 'Are you sure you want to trash selected announcement?';
      }
      this.confirmDialogRef.afterClosed()
          .subscribe(result => {
              if ( result )
              {
                  let deleteData = {
                      'content_id': id.toString().split(',')
                  };
                  let deleteUrl =  this.trash==true ? 'delete/contentpermanentdelete' : 'delete/content';
                  this._announceService.deleteField(deleteUrl,deleteData)
                  .subscribe(deleteResponse=>{
                      // Show the success message
                      if(this.route.routeConfig.path == "admin/announcement/event"){
                      this.selection.clear();
                      this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
                      this.trash==true? this.filterParams['content_type'] = "event-announcement": this.filterParams['content_type'] = "event-announcement";
                      this.trash==true ? this.filterParams['trash'] = 1 : ''
                      this.filterParams['column']        = 'order';
                      this.filterParams['direction']     = 'asc';
                      this.dataSource.getFilteredAnnouncement(this.filterParams);
                      }
                      else{
                        this.selection.clear();
                        this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
                        this.trash==true? this.filterParams['content_type'] = "dining-announcement": this.filterParams['content_type'] = "dining-announcement";
                        this.trash==true ? this.filterParams['trash'] = 1 : ''
                        this.filterParams['column']        = 'order';
                        this.filterParams['direction']     = 'asc';
                        this.dataSource.getFilteredAnnouncement(this.filterParams);
                      }
                      this._matSnackBar.open(deleteResponse.message, 'CLOSE', {
                          verticalPosition: 'top',
                          duration        : 2000
                      });
                  },
                  error => {
                      // Show the error message
                      this._matSnackBar.open(error.message, 'Retry', {
                              verticalPosition: 'top',
                              duration        : 2000
                      });
                  });
              }
              this.confirmDialogRef = null;
          });
  }

        dropTable(event: CdkDragDrop<any[]>) {
            const prevIndex = this.dataSource.filteredData.data.findIndex((d) => d === event.item.data);
            moveItemInArray(this.dataSource.filteredData.data, prevIndex, event.currentIndex);
            this.table.renderRows();
            let sortedRows = this.dataSource.filteredData.data.map((item,index)=>{return {content_id:item.content_id,order:++index}})
            this.saveSortRows(sortedRows);

        }

        saveSortRows(rowsSource:any[]=[]){
            let rowsRequest = {datasource:rowsSource};
            console.log(rowsRequest);
            this._announceService.saveSorting(rowsRequest)
            .pipe(first(),takeUntil(this._unsubscribeAll))
            .subscribe(
                data => {
                    if(data.status==200){
                    this.showSnackBar(data.message,'CLOSE');
                    }
                    else{
                    this.showSnackBar(data.message,'CLOSE');
                    }
                    
                },
                error => {
                    // Show the error message
                    this._matSnackBar.open(error.message, 'Retry', {
                        verticalPosition: 'top',
                        duration        : 2000
                });
            });
        }

           /** SHOW SNACK BAR */
   showSnackBar(message:string,buttonText:string){
    this._matSnackBar.open(message, buttonText, {
        verticalPosition: 'top',
        duration        : 2000
    });
}
  changeSingleStatus(type,id)
  {
      this.changeStatus(type,id)
  }
  changeStatus(type:string="A",selectid){
      let contentid;
      if(this.selection.selected){
          contentid = this.selection.selected
      }
      if(selectid){
          contentid = selectid.toString().split(",");
      }
      this._commonService.changeStatus({'id':contentid,'status':type,'type':'Content'})
      .subscribe(statusResponse=>{
          // Show the success message
          if(this.route.routeConfig.path == "admin/announcement/event"){
          this.selection.clear();
          this.filterParams['content_type'] = "event-announcement";
          this.filterParams['column']        = 'order';
          this.filterParams['direction']     = 'asc';
          this.dataSource.getFilteredAnnouncement(this.filterParams);
          }else
          {
            this.selection.clear();
          this.filterParams['content_type'] = "dining-announcement";
          this.filterParams['column']        = 'order';
          this.filterParams['direction']     = 'asc';
          this.dataSource.getFilteredAnnouncement(this.filterParams);
          }
          this._matSnackBar.open(statusResponse.message, 'CLOSE', {
              verticalPosition: 'top',
              duration        : 2000
          });
      },
      error => {
          // Show the error message
          this._matSnackBar.open(error.message, 'RETRY', {
              verticalPosition: 'top',
              duration        : 2000
          });
      });
  }

  restoreAll() 
  {
      this.restoreItem(this.selection.selected);
  }
  restoreItem(id)
  {
      let restoreData = {
          'content_id': id.toString().split(',')
      };
      this._commonService.restore('delete/contentrestore',restoreData)
      .subscribe(deleteResponse=>{
          // Show the success message
          if(this.route.routeConfig.path == "admin/announcement/event/trash"){
          this.selection.clear();
          this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
          this.trash==true ? this.filterParams['content_type'] = "event-announcement" : this.filterParams['content_type'] = "event-announcement";
          this.trash==true ? this.filterParams['trash'] = 1 : '';
          this.filterParams['column']        = 'order';
          this.filterParams['direction']     = 'asc';
          this.dataSource.getFilteredAnnouncement(this.filterParams);
          }else{

            this.selection.clear();
            this.filterParams = CommonUtils.getFilterJson(this.sort,this.paginator,this.filterForm.value);
            this.trash==true ? this.filterParams['content_type'] = "dining-announcement" : this.filterParams['content_type'] = "dining-announcement";
            this.trash==true ? this.filterParams['trash'] = 1 : '';
            this.filterParams['column']        = 'order';
            this.filterParams['direction']     = 'asc';
            this.dataSource.getFilteredAnnouncement(this.filterParams);
          }
          this._matSnackBar.open(deleteResponse.message, 'CLOSE', {
              verticalPosition: 'top',
              duration        : 2000
          });
      },
      error => {
          // Show the error message
          this._matSnackBar.open(error.message, 'Retry', {
                  verticalPosition: 'top',
                  duration        : 2000
          });
      });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void
  {
      // Unsubscribe from all subscriptions
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
  }
}

export class FilesDataSource extends DataSource<any>
{
  private _filterChange       = new BehaviorSubject('');
  private _filteredDataChange = new BehaviorSubject('');

  /**
   * Constructor
   *
   * @param {AnnouncementService} _announceService
   * @param {MatPaginator} _matPaginator
   * @param {MatSort} _matSort
   */
  constructor(
      private _announceService: AnnouncementService,
      private _matPaginator: MatPaginator,
      private _matSort: MatSort
  )
  {
      super();

    //   this.filteredData = this._announceService.home;
    let data          = this._announceService.home;
    this.filteredData = data;
    this.filterData(this.filteredData);
  }

  /**
   * Connect function called by the table to retrieve one stream containing the data to render.
   *
   * @returns {Observable<Home[]>}
   */
  connect(): Observable<Home[]>
  {
      const displayDataChanges = [
          this._announceService.onAnnounceChanged
      ];
      return merge(...displayDataChanges)
          .pipe(
          map(() => {
                  let data          = this._announceService.home;
                  this.filteredData = data;
                  data              = this.filterData(data);
                  return data;
              }
          ));
  }

  // Filtered data
  get filteredData(): any
  {
      return this._filteredDataChange.value;
  }

  set filteredData(value: any)
  {
      this._filteredDataChange.next(value);
  }

  // Filter
  get filter(): string
  {
      return this._filterChange.value;
  }

  set filter(filter: string)
  {
      this._filterChange.next(filter);
  }
  
  /**
   * Filter data
   *
   * @param data
   * @returns {any}
   */
  filterData(data): any
  {
      return data.data.map(c => new Home().deserialize(c,'listAnn'));
  }
  /**
   * Get Filtered Users
   * 
   */
  getFilteredAnnouncement(params:any){
      return this._announceService.getLists(params).then(Response=>{
          return Response;
      });
  }
  /**
   * Disconnect
   */
  disconnect(): void
  {
  }
}