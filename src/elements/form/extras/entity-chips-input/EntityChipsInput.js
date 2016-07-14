import { Component, EventEmitter } from '@angular/core';
import { COMMON_DIRECTIVES, NgModel } from '@angular/common';

import { BaseInput, EntityPickerResults } from './../FormExtras';
import { NOVO_CHIPS_ELEMENTS } from './../../../chips';
import { NOVO_PICKER_ELEMENTS } from './../../../picker';
import { NovoLabelService } from './../../../../novo-elements';

@Component({
    selector: 'entity-chips-input',
    inputs: [
        'name',
        'placeholder',
        'options',
        'required'
    ],
    outputs: ['inputState'],
    directives: [COMMON_DIRECTIVES, NOVO_CHIPS_ELEMENTS, NOVO_PICKER_ELEMENTS, NgModel],
    template: `
        <i *ngIf="required" class="required-indicator" [ngClass]="{'bhi-circle': !control.valid, 'bhi-check': control.valid}"></i>
        <chips
            [type]="options.type"
            [source]="options"
            [ngModel]="tmp"
            (changed)="onChanged($event)"
            [placeholder]="placeholder"
            (focus)="toggleInactive($event)"
            (blur)="toggleInactive($event)"
            >
        </chips>
        <i class="bhi-search"></i>
        <input [name]="name" type="hidden" [attr.id]="name" [(ngModel)]="value" autocomplete="off" [ngFormControl]="control" />
        <span class="error-message" *ngIf="required && control.touched && !control.valid">{{labels.required}}</span>
    `
})
export class EntityChipsInput extends BaseInput {
    inactive:Boolean = false;
    inputState:EventEmitter = new EventEmitter();

    constructor(labels:NovoLabelService) {
        super();
        this.labels = labels;
    }

    ngOnInit() {
        super.ngOnInit();
        this.ngOnChanges();
        setTimeout(() => {
            this.toggleInactive(null);
        }, 10);
    }

    ngOnChanges() {
        this.options = Object.assign(this.options, {
            resultsTemplate: EntityPickerResults
        });
    }

    onChanged(e) {
        this.value = e;
        this.update.emit(this.value);
        this.toggleInactive({ type: 'select' });
    }

    toggleInactive(ev) {
        setTimeout(() => {
            this.value = this.value || [];

            if (ev) {
                if (ev.type === 'focus' || this.value.length || this.placeholder) this.inactive = false;
                else this.inactive = true;
            } else {
                if (this.placeholder || this.value.length) this.inactive = false;
                else this.inactive = true;
            }

            this.inputState.emit({
                value: this.inactive
            });
        });
    }
}
