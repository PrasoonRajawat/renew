sap.ui.define([
    "com/ibscms/demo/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "com/ibscms/demo/model/formatter",
    "sap/m/library",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, formatter, mobileLibrary, MessageBox) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("com.ibscms.demo.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
            });

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
            
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler when the share by E-Mail button has been clicked
         * @public
         */
        onSendEmailPress: function () {
            var oViewModel = this.getModel("detailView");

            URLHelper.triggerEmail(
                null,
                oViewModel.getProperty("/shareSendEmailSubject"),
                oViewModel.getProperty("/shareSendEmailMessage")
            );
        },


        /**
         * Updates the item count within the line item table's header
         * @param {object} oEvent an event containing the total number of items in the list
         * @private
         */
        onListUpdateFinished: function (oEvent) {
            var sTitle,
                iTotalItems = oEvent.getParameter("total"),
                oViewModel = this.getModel("detailView");

            // only update the counter if the length is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (iTotalItems) {
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                oViewModel.setProperty("/lineItemListTitle", sTitle);
            }
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this._getData(sObjectId);
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            //this.getModel().metadataLoaded().then( function() {
            //    var sObjectPath = this.getModel().createKey("WIPOGETSet", {
            //        WiId:  sObjectId ,
            //        WiRhTask : "TS00800531"
            //    });
            //    this._bindView("/" + sObjectPath);
            //}.bind(this));
        },
        _getData: function (temp) {
            this.getModel("detailView").setProperty("/busy", true);
            var useFulData = temp;
            //var srvUrl = "/sap/opu/odata/sap/ZZ1_TEST_RENEW_PO_APPR_SRV/";
            //var oModel = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
            var oModel = this.getOwnerComponent().getModel();
            var readurl = "/WIPOGETSet";
            var filter1 = new sap.ui.model.Filter({
                path: "WiId",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: useFulData
            });
            var filter2 = new sap.ui.model.Filter({
                path: "WiRhTask",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: "TS00800531"
            });

            var that = this;
            oModel.read(readurl, {
                filters: [filter1, filter2],
                success: function (oData) {
                    if (oData) {
                        var newData = oData;
                        var newModel = new JSONModel(newData);
                        that.getView().setModel(newModel);
                        that.getView().byId("detailPage");
                        that.getModel("detailView").setProperty("/busy", false);


                    }
                },
                error: function (oError) {

                }
            });
        },
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearMasterListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectId = oObject.WiId,
                sObjectName = oObject.WiId,
                oViewModel = this.getModel("detailView");

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView"),
                oLineItemTable = this.byId("lineItemsList"),
                iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);
            oViewModel.setProperty("/lineItemTableDelay", 0);

            oLineItemTable.attachEventOnce("updateFinished", function () {
                // Restore original busy indicator delay for line item table
                oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
            });

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            //this.getOwnerComponent().oListSelector.clearListListSelection();
            this.getRouter().navTo("list");
        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        },
        onApprovePress: function (oEvent) {

            var actionText = oEvent.getSource().mProperties.text;
            var sId = this.getView().getModel().getData().results[0].WiId
            var oEntry = {};
            oEntry.WiId = sId;
            if (actionText === 'Approve') {
                oEntry.WiStat = 'A';
                oEntry.DecisionKey = '0001'
            }
            else {
                oEntry.WiStat = 'R';
                oEntry.DecisionKey = '0002'
            }
            var srvUrl = "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2/";
            var oModel = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
            var readurl = "/Decision";
            var that = this;
            oModel.callFunction(readurl, {
                method: "POST",
                //urlParameters: {
                //    "WiId": oEntry.WiId,
                //    "WiStat": oEntry.WiStat
                //},
                urlParameters:{
                    "SAP__Origin": 'LOCAL_PGW',
                    "InstanceID": oEntry.WiId,
                    "DecisionKey":oEntry.DecisionKey,
                    "Comments":'test'
                },
                success: function (oData, oResponse) {

                    //var hdrMessage = oResponse.headers["sap-message"];
                    //var hdrMessageObject = oResponse.statusCode;
                    MessageBox.success(
                        "PO Processed", {
                        title: "Success",
                            
                        //actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        //emphasizedAction: MessageBox.Action.YES,
                        onClose: function (oAction) {
                            that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                            // No item should be selected on list after detail page is closed
                            that.getOwnerComponent().oListSelector.clearListListSelection();
                            that.getRouter().navTo("list");
                        }
                    }
                    );

                },
                error: function (oError,oResponse) {
                    //var hdrMessage = oResponse.headers["sap-message"];
                    //var hdrMessageObject = JSON.parse(hdrMessage);
                    var a  = JSON.parse(oError.response.body);
                    var hdrMessageObject = a.error["message"].value;
                    MessageBox.error(
                        hdrMessageObject,{
                            title: "Error",
                            onClose: function (oAction) {
                                that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                                // No item should be selected on list after detail page is closed
                                that.getOwnerComponent().oListSelector.clearListListSelection();
                                that.getRouter().navTo("list");
                            }
                        }
                    );
                }

            });

        }
    });

});