import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { Subject, merge } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { OptionsList, AnnouncementService, CommonService, SettingsService } from 'app/_services';
import { FormGroup } from '@angular/forms';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DashboardService } from 'app/_services/dashboard.service';
import { FormEntry } from 'app/_models/formentry.model';

@Component({
  selector: 'app-form-entries',
  templateUrl: './form-entries.component.html',
  styleUrls: ['./form-entries.component.scss'],
  animations: fuseAnimations
})
export class FormEntriesComponent implements OnInit {
  @Input() homesettings: any;
  public green_bg_header: any;
  public button: any;
  public accent: any;
  // Private
  private _unsubscribeAll: Subject<any>;
  public ForumSettings: any;
  public filterForm: FormGroup;
  public defaultDateTimeFormat: any = { date_format: 'MM/dd/yyyy', time_format: "h:mm a" };
  public formEntriesList: any = {data:[]};
  public filterParams: any = {};
  public statusName: any = [];

  @ViewChild(MatPaginator, { static: true })
  paginator: MatPaginator;
  PaginationOpt: { 'pageSize': '', pageSizeOptions: [], page: 1 }; //pagination size,page options  

  constructor(
    private _dashboardservice: DashboardService,
    private settingsservices: SettingsService,
    private _commonService: CommonService,
    private router: Router) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();
  }

  ngOnInit() {

    this.settingsservices.getSetting({
      'meta_type': 'F',
      'meta_key': 'form-settings'
    }).then(response => {
      this.statusName = JSON.parse(response.settingsinfo.meta_value);
    })
    let pageLimit: any = [];
    pageLimit[0] = 5;
    //Deault DateTime Formats
    this.defaultDateTimeFormat = this._commonService.getDefaultDateTimeFormat;
    //Pagination options
    this.PaginationOpt = { ...OptionsList.Options.tables.pagination.options };
    this.ForumSettings = OptionsList.Options.forumsettings;
    //Set Default pagination limit from settings
    setTimeout(() => {
      this.PaginationOpt.pageSize = pageLimit || this.PaginationOpt.pageSize;


      this.getFormEntriesList(null);
      //get topicslist by filters and paigantion
      merge(this.paginator.page)
        .pipe(
          takeUntil(this._unsubscribeAll),
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(res => {
          this.getFormEntriesList(res);
        });

    }, 1000);

    // apply theme settings
    let themeData: any = this._commonService.getLocalSettingsJson('themesettings');
    if (typeof themeData == 'string') {
      let currentData = JSON.parse(themeData);
      themeData = currentData[0];
    }
    this.green_bg_header = { 'background-color': themeData.table_header_background_color || '#afbb2a', 'color': themeData.table_font_color || '#f9fafa'};
    this.button = { 'background-color': themeData.button_background_color, 'font-size': themeData.button_font_size, 'color': themeData.button_font_color }
    this.accent = { 'background-color': themeData.admin_navigation_bar_background_color, 'color': themeData.admin_navigation_bar_font_color };
    let checkelement = Array.from(document.getElementsByClassName('mat-paginator-icon') as HTMLCollectionOf<HTMLElement>);
    checkelement.forEach((element) => {
      element.style.backgroundColor = themeData.table_header_background_color;
      element.style.color = themeData.table_font_color;
      element.style.width = '24px';
    });
  }
  //get Topiclist
  getFormEntriesList(res) {
    //get Topiclist from Api
    this.filterParams['page'] = res == null ? 1 : res.pageIndex + 1;
    this.filterParams['limit'] = res == null ? 5 : res.pageSize;

    this._dashboardservice.getFormEntriesList(this.filterParams).subscribe(response => {
      //*MAS Changes
      this.formEntriesList      = response; 
      if(this.formEntriesList && this.formEntriesList.data && this.formEntriesList.data.length>0){
        this.formEntriesList.data = this.formEntriesList.data.map(c => new FormEntry().deserialize(c, 'entries'));
      }
      
    })
  }
  //Reset PageIndex On Form Changes
  resetPageIndex() {
    this.paginator.pageIndex = 0;
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