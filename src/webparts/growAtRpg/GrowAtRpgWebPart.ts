import { Version } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  IPropertyPaneDropdownOption,
  PropertyPaneDropdown,
  PropertyPaneTextField,
  PropertyPaneFieldType
} from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';
import { escape } from '@microsoft/sp-lodash-subset';

import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

import styles from './GrowAtRpgWebPart.module.scss';
import * as strings from 'GrowAtRpgWebPartStrings';

export interface IGrowAtRpgWebPartProps {
  description: string;
  selectedList: string; 
  seeAllButton: string;
  JobTitle: string;
  GroupCompany: string;
  DateofJR: string;
  Apply:{
    Url: string;
  }
}

export default class GrowAtRpgWebPart extends BaseClientSideWebPart<IGrowAtRpgWebPartProps> {

  private availableLists: IPropertyPaneDropdownOption[] = [];

  public render(): void {
    const decodedDescription = decodeURIComponent(this.properties.description); // Decode the description (like incase there is blank space, or special characters, etc)
    console.log("Title: ",decodedDescription);
    const decodedSeeAllButton = decodeURIComponent(this.properties.seeAllButton);
    console.log("Url for See All button: ",decodedSeeAllButton);
    
    this.domElement.innerHTML = `
  <div class="${styles.application}">
    <div class="${styles.container}">
      <div class="${styles.joinCommunity}">
        <div class="${styles.topSection}">
          <h2>${decodedDescription}</h2> 
          <a id="growAtRpgLink" target="_self" data-interception="off">See All</a>
        </div>
        <div id="buttonsContainer" class="${styles.buttonsContainer}"></div>
      </div>
    </div>
  </div>`;

  const seeAllLink = document.getElementById('growAtRpgLink') as HTMLElement;

    // Assuming you have a container element to append the link
    // const buttonsContainer = document.getElementById('top-Section');
    // buttonsContainer!.appendChild(seeAllLink);

    // Alternatively, if you want to handle the click event programmatically
    seeAllLink.onclick = (event) => {
      event.preventDefault(); // Prevent the default behavior of the click event
      window.location.href = decodedSeeAllButton; // Navigate to the URL in the same tab
    };

    this._renderButtons();
  }

  private _renderButtons(): void {
    const buttonsContainer: HTMLElement | null = this.domElement.querySelector('#buttonsContainer');
    
    const apiUrl: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${this.properties.selectedList}')/items?$orderby=DateofJR desc&$top=3`;

    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'Content-Type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log("Api response: ", data);

      if (data.value && data.value.length > 0) {
        data.value.forEach((item: IGrowAtRpgWebPartProps) => {

            console.log("Creating button for ", item.JobTitle);
            const button: HTMLButtonElement = document.createElement('button');
            button.classList.add(styles.buttonsContainer);

            const jobTitle: HTMLDivElement = document.createElement('div');
            jobTitle.className = styles.jobTitle;
            jobTitle.textContent = item.JobTitle;
            
            const groupCompany: HTMLDivElement = document.createElement('div'); 
            groupCompany.className = styles.company;
            groupCompany.textContent = item.GroupCompany;

            const date = item.DateofJR.substring(0, 10);
            const formattedDate = this.formatBirthday(date);
            const dateOfJR: HTMLDivElement = document.createElement('div'); 
            dateOfJR.className = styles.date;
            dateOfJR.textContent = formattedDate; 

            const a: HTMLAnchorElement = document.createElement('a');
            a.href = item.Apply.Url;
            a.style.textDecoration = "none";
            a.setAttribute("target", "_blank");
            // a.setAttribute("target", "_self");
            // a.setAttribute("data-interception", "off");
            const link: HTMLDivElement = document.createElement('div');
            link.className = styles.link;
            link.textContent = "Apply";

            button!.appendChild(jobTitle);
            button!.appendChild(groupCompany);
            button!.appendChild(dateOfJR);
            a.appendChild(link);
            button!.appendChild(a);
            buttonsContainer!.appendChild(button);
        });
      } else {
        const noDataMessage: HTMLDivElement = document.createElement('div');
        noDataMessage.textContent = 'No Job Descriptions Available.';
        buttonsContainer!.appendChild(noDataMessage);
      }
    })
    .catch(error => {
      console.error("Error fetching user data: ", error);
    });
}

private formatBirthday(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected onPropertyPaneConfigurationStart(): void {
    this._loadLists();
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: any, newValue: any): void {
    if (propertyPath === 'selectedList') {
      this.setListTitle(newValue);
    }

    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
  }

  private _loadLists(): void {
    const listsUrl = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists`;
    //SPHttpClient is a class provided by Microsoft that allows developers to perform HTTP requests to SharePoint REST APIs or other endpoints within SharePoint or the host environment. It is used for making asynchronous network requests to SharePoint or other APIs in SharePoint Framework web parts, extensions, or other components.
    this.context.spHttpClient.get(listsUrl, SPHttpClient.configurations.v1)
    //SPHttpClientResponse is the response object returned after making a request using SPHttpClient. It contains information about the response, such as status code, headers, and the response body.
      .then((response: SPHttpClientResponse) => response.json())
      .then((data: { value: any[] }) => {
        this.availableLists = data.value.map((list) => {
          return { key: list.Title, text: list.Title };
        });
        this.context.propertyPane.refresh();
      })
      .catch((error) => {
        console.error('Error fetching lists:', error);
      });
  }

  private setListTitle(selectedList: string): void {
    this.properties.selectedList = selectedList;

    this.context.propertyPane.refresh();
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.DescriptionFieldLabel,
          },
          groups: [
            {
              groupFields: [
                PropertyPaneTextField('description', {
                  label: "Title For The Application"
                }),
                PropertyPaneDropdown('selectedList', {
                  label: 'Select A List',
                  options: this.availableLists,
                }),
                PropertyPaneTextField('seeAllButton',{
                  label: 'Url for See All button'
                })
              ],
            },
          ],
        }
      ]
    };
  }
}
