import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { FuseConfirmDialogComponent } from '@fuse/components/confirm-dialog/confirm-dialog.component';  //EXTRA Changes
//Export Option Compo
import { ExportComponent } from 'app/layout/components/export/export.component';

import { DataSource, SelectionModel } from '@angular/cdk/collections';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

import { fuseAnimations } from '@fuse/animations';
import { OptionsList, CommonService, UsersService, RolesService, AppConfig } from 'app/_services';
import { CommonUtils } from 'app/_helpers';
import { User } from 'app/_models';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    animations: fuseAnimations,
    encapsulation: ViewEncapsulation.None
})
export class ListComponent implements OnInit {

    public green_bg_header: any;
    public button: any;
    public accent: any;
    _localUserSettings: any;
    isTrashView: boolean = false;
    deleteusersArray: any[] = [];
    confirmDialogRef: MatDialogRef<FuseConfirmDialogComponent>; //EXTRA Changes  
    exportDialogref: MatDialogRef<ExportComponent>; //EXTRA Changes  
    filterForm: FormGroup;
    filterParams: any = {};
    PaginationOpt: { 'pageSize': '', pageSizeOptions: [] }; //pagination size,page options
    Columns: [];
    RoleList: any = {};
    StatusList: any;
    displayedColumns: string[];
    dataSource: FilesDataSource | null;
    selection = new SelectionModel<any>(true, []);
    _defaultAvatar = "";
    @ViewChild(MatPaginator, { static: true })
    paginator: MatPaginator;
    userId: number = null;
    @ViewChild(MatSort, { static: true })
    sort: MatSort;

    @ViewChild('filter', { static: true })
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
        private route: ActivatedRoute,
        private _appConfig: AppConfig,
        private _rolesService: RolesService,
        private _commonService: CommonService,
        private _usersService: UsersService,
        private _formBuilder: FormBuilder,
        public _matDialog: MatDialog,
        private _matSnackBar: MatSnackBar
    ) {
        // Set the private defaults
        this._unsubscribeAll = new Subject();

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.userId = JSON.parse(localStorage.getItem('token')).user_id;

        //Load Users Settings From Localstorage
        this._localUserSettings = this._appConfig._localStorage.value.settings;
        this._defaultAvatar = AppConfig.Settings.url.mediaUrl + this._localUserSettings.users_settings.defaultprofile || AppConfig.Settings.url.defaultAvatar;
        //Pagination Options
        this.PaginationOpt = OptionsList.Options.tables.pagination.options;
        //Roles List
        this.RoleList = this._rolesService.roles.data;
        this.StatusList = OptionsList.Options.tables.status.users;
        this.Columns = OptionsList.Options.tables.list.users;
        this.displayedColumns = OptionsList.Options.tables.list.users.map(col => col.columnDef);
        this.dataSource = new FilesDataSource(this._usersService, this.paginator, this.sort);

        //Declare Filter Form
        this.filterForm = this._formBuilder.group({
            searchKey: [''],
            roles: [''],
            status: [''],
            trash: ['']

        });
        //Show Buttons Of permenat Delete and restore on trash view
        this.isTrashView = this.route.routeConfig.path == 'admin/users/trash' ? true : this.isTrashView;
        this.route.data['value'].trash ? this.filterForm.get('trash').setValue(this.route.data['value'].trash) : "";
        this.resetPageIndex(); //#Reset PageIndex of form if search changes

        merge(this.sort.sortChange, this.paginator.page, this.filterForm.valueChanges)
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(500),
                distinctUntilChanged()
            )
            .subscribe(res => {
                this.selection.clear();
                this.filterParams = CommonUtils.getFilterJson(this.sort, this.paginator, this.filterForm.value);
                this.dataSource.getFilteredUsers(this.filterParams);
            });

        // apply theme settings
        let themeData: any = this._commonService.getLocalSettingsJson('themesettings');
        if (typeof themeData == 'string') {
            let currentData = JSON.parse(themeData);
            themeData = currentData[0];
        }
        this.accent = { 'background-color': themeData.admin_navigation_bar_background_color, 'color': themeData.admin_navigation_bar_font_color };
        this.green_bg_header = { 'background-color': themeData.table_header_background_color, 'color': themeData.table_font_color };
        this.button = { 'background-color': themeData.button_background_color, 'font-size': themeData.button_font_size, 'color': themeData.button_font_color };

        let checkelement = Array.from(document.getElementsByClassName('mat-paginator-icon') as HTMLCollectionOf<HTMLElement>);
        checkelement.forEach((element) => {
            element.style.backgroundColor = themeData.table_header_background_color;
            element.style.color = themeData.table_font_color;
            element.style.width = '24px';
        });
    }
    //Reset PageIndex On Form Changes
    resetPageIndex() {
        this.filterForm.valueChanges.subscribe(data => {
            this.paginator.pageIndex = 0;
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.filteredData.data.length;
        return numSelected === numRows;
    }
    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.filteredData.data.forEach(row => this.selection.select(row.id));
    }
    /**ACTION FUNCTIONS */
    /** SOFT OR PERMENENT DELETE USER */
    deleteUser(userId: number = 0) {
        if (userId > 0) {
            this.selection.selected.push(userId);
        }
        //RemoveCurrent User From Array
        let usersArray = [...this.selection.selected];
        this.deleteusersArray = usersArray.filter(item => item !== this.userId);
        this.confirmDialogRef = this._matDialog.open(FuseConfirmDialogComponent, {
            disableClose: false
        });
        this.confirmDialogRef.componentInstance.confirmMessage = 'Are you sure you want to delete selected user?';
        this.confirmDialogRef.afterClosed()
            .subscribe(result => {
                if (result) {
                    this._usersService.deleteUsers({ 'user_id': this.deleteusersArray })
                        .subscribe(deleteResponse => {
                            this.selection.clear();
                            this.deleteusersArray = [];
                            //Set Page Index to 0
                            this.paginator.pageIndex = 0;
                            //send filters params again to maintain page limit search .....
                            this.filterParams = CommonUtils.getFilterJson(this.sort, this.paginator, this.filterForm.value);
                            this.dataSource.getFilteredUsers(this.filterParams);
                            // Show the success message
                            this.showSnackBar(deleteResponse.message, 'CLOSE');
                        },
                            error => {
                                // Show the error message
                                this.showSnackBar(error.message, 'RETRY');
                            });
                }
                else {
                    this.selection.clear();
                }
                this.confirmDialogRef = null;
            });
    }
    changeStatus(type: string = "A", id: number) {
        this._commonService.changeStatus({ 'id': this.selection.selected.length ? this.selection.selected : [id], 'status': type, 'type': 'Resident' })
            .subscribe(statusResponse => {
                this.selection.clear();
                this.filterParams = CommonUtils.getFilterJson(this.sort, this.paginator, this.filterForm.value);
                this.dataSource.getFilteredUsers(this.filterParams);
                // Show the success message
                this.showSnackBar(statusResponse.message, 'CLOSE');
            },
                error => {
                    // Show the error message
                    this.showSnackBar(error.message, 'RETRY');
                });
    }
    /**RESTORE USER */
    restoreOrDeleteUser(userId: number = 0, permenent: boolean = false) {
        if (userId > 0) {
            this.selection.selected.push(userId);
        }
        this.confirmDialogRef = this._matDialog.open(FuseConfirmDialogComponent, {
            disableClose: false
        });
        let confirmMessage = 'Are you sure you want to restore selected user?';
        let apiEndPoint = 'userrestore';
        //set ApiEndPoint as per flag
        if (permenent == true) {
            confirmMessage = 'Are you sure you want to delete selected user? user cannot be restored';
            apiEndPoint = 'userpermanentdelete';
        }

        this.confirmDialogRef.componentInstance.confirmMessage = confirmMessage;
        this.confirmDialogRef.afterClosed()
            .subscribe(result => {
                if (result) {
                    this._commonService.restoreItems({ 'user_id': this.selection.selected, 'endPoint': apiEndPoint })
                        .subscribe(restoreResponse => {
                            this.selection.clear();
                            //Set Page Index to 0
                            this.paginator.pageIndex = 0;
                            this.filterParams = CommonUtils.getFilterJson(this.sort, this.paginator, this.filterForm.value);
                            this.dataSource.getFilteredUsers(this.filterParams);
                            // Show the success message
                            this.showSnackBar(restoreResponse.message, 'CLOSE');
                        },
                            error => {
                                // Show the error message
                                this.showSnackBar(error.message, 'RETRY');
                            });
                }
                else {
                    this.selection.clear();
                }
                this.confirmDialogRef = null;
            });
    }
    /** EXPORT USER DATA */
    exportUser() {
        this.exportDialogref = this._matDialog.open(ExportComponent, {
            disableClose: false
        });
        this.exportDialogref.afterClosed()
            .subscribe(result => {
                if (result) {
                    this.showSnackBar('Exporting Data', 'CLOSE');
                    this.filterParams.type = result;
                    this.filterParams.userids = this.selection.selected;
                    this.filterParams.userids = this.filterParams.userids.join(",")
                    this._commonService.exportUsers(this.filterParams);
                }
                this.exportDialogref = null;
            });
    }
    downloadFile(downloadInfo) {
        this._commonService.downloadFile(downloadInfo)
            .subscribe(downloadResponse => {
                console.log(downloadResponse);
            });
    }
    /** SHOW SNACK BAR */
    showSnackBar(message: string, buttonText: string) {
        this._matSnackBar.open(message, buttonText, {
            verticalPosition: 'top',
            duration: 2000
        });
    }
    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

}

export class FilesDataSource extends DataSource<any>
{
    private _filterChange = new BehaviorSubject('');
    private _filteredDataChange = new BehaviorSubject('');
    /**
     * Constructor
     *
     * @param {UsersService} _usersService
     * @param {MatPaginator} _matPaginator
     * @param {MatSort} _matSort
     */
    constructor(
        private _usersService: UsersService,
        private _matPaginator: MatPaginator,
        private _matSort: MatSort
    ) {
        super();

        this.filteredData = this._usersService.users;
    }

    /**
     * Connect function called by the table to retrieve one stream containing the data to render.
     *
     * @returns {Observable<User[]>}
     */
    connect(): Observable<User[]> {
        const displayDataChanges = [
            this._usersService.onUsersChanged
        ];
        return merge(...displayDataChanges)
            .pipe(
                map(() => {
                    let data = this._usersService.users;
                    console.log(data);
                    this.filteredData = data;
                    console.log(data);
                    data = this.filterData(data);
                    return data;
                }
                ));
    }

    // Filtered data
    get filteredData(): any {
        return this._filteredDataChange.value;
    }

    set filteredData(value: any) {
        this._filteredDataChange.next(value);
    }

    // Filter
    get filter(): string {
        return this._filterChange.value;
    }

    set filter(filter: string) {
        this._filterChange.next(filter);
    }

    /**
     * Filter data
     *
     * @param data
     * @returns {any}
     */
    filterData(userdata): any {
        return userdata.data.map(c => new User().deserialize(c, 'list'));
    }
    /**
     * Get Filtered Users
     * 
     */
    getFilteredUsers(params: any) {
        return this._usersService.getUsers(params).then(Response => {
            return Response;
        });
    }
    /**
     * Disconnect
     */
    disconnect(): void {
    }
}