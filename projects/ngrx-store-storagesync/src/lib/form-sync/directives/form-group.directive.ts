import { Directive, HostListener, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { select, Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter, first, map, withLatestFrom } from 'rxjs/operators';
import { IFormSyncConfig } from '../models/form-sync-config';
import { FORM_SYNC_CONFIG } from '../providers/form-sync.providers';
import { FormSyncService } from '../services/form-sync.service';
import { patchForm } from '../store/form.actions';
import { getFormSyncValue } from '../store/form.selectors';
import { FormControlDirective } from './form-control.directive';

@Directive({
  selector: '[formGroup]'
})
export class FormGroupDirective implements OnInit, OnDestroy {
  @Input() formGroup: FormGroup;
  @Input() formGroupId: string;
  @Input() formGroupSync = true;

  constructor(
    @Optional() private readonly store: Store<any>,
    @Inject(FORM_SYNC_CONFIG) private readonly config: IFormSyncConfig,
    private readonly formSync: FormSyncService
  ) {}

  private readonly subscriptions = new Subscription();
  private readonly formControlDirectives$ = this.formSync.formControlDirectives$.pipe(
    map(directives => {
      return directives
        .filter(({ formControlSync }) => !formControlSync)
        .filter(({ formControl }) => this.includesControl(this.formGroup.controls, formControl));
    })
  );

  ngOnInit(): void {
    if (!this.formGroupId) {
      return;
    }
    if (!this.store) {
      throw Error('@larscom/ngrx-store-storagesync requires you to install @ngrx/store >=8.0.0');
    }

    const { syncOnSubmit, syncValidOnly, syncRawValue } = this.config;

    this.subscriptions.add(
      this.formGroup.valueChanges
        .pipe(
          filter(() => this.formGroupSync),
          filter(() => !(syncValidOnly && !this.formGroup.valid)),
          filter(() => !syncOnSubmit),
          withLatestFrom(this.formControlDirectives$)
        )
        .subscribe(([, directives]) => this.patchFormGroup(directives, syncRawValue))
    );

    this.subscriptions.add(
      this.store
        .pipe(
          filter(() => this.formGroupSync),
          select(getFormSyncValue, { id: this.formGroupId }),
          filter(value => value != null)
        )
        .subscribe(value => this.formGroup.patchValue(value, { emitEvent: false }))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('submit')
  async onSubmit(): Promise<void> {
    if (!this.formGroupId || !this.formGroupSync) {
      return;
    }

    const { syncOnSubmit, syncValidOnly, syncRawValue } = this.config;

    if (!syncOnSubmit) {
      return;
    }

    if (syncValidOnly && !this.formGroup.valid) {
      return;
    }

    const directives = await this.formControlDirectives$.pipe(first()).toPromise();
    this.patchFormGroup(directives, syncRawValue);
  }

  private patchFormGroup(directives: FormControlDirective[], syncRawValue: boolean): void {
    const initialValues = new Map<FormControl, string>();
    this.deleteValues(directives, initialValues);

    const value = syncRawValue ? this.formGroup.getRawValue() : this.formGroup.value;
    this.store.dispatch(patchForm({ id: this.formGroupId, value }));

    this.restoreValues(directives, initialValues);
  }

  private deleteValues(directives: FormControlDirective[], initialValues: Map<FormControl, string>): void {
    directives.forEach(({ formControl }) => {
      initialValues.set(formControl, formControl.value);
      formControl.setValue(null, { emitEvent: false });
    });
  }

  private restoreValues(directives: FormControlDirective[], initialValues: Map<FormControl, string>): void {
    directives.forEach(({ formControl }) => formControl.setValue(initialValues.get(formControl), { emitEvent: false }));
  }

  private includesControl(controls: { [key: string]: AbstractControl }, targetControl: FormControl): boolean {
    return Object.keys(controls).some(key => {
      if (!controls.hasOwnProperty(key)) {
        return;
      }

      if (controls[key] === targetControl) {
        return true;
      }

      const formGroup = controls[key] as FormGroup;
      if (formGroup.controls) {
        this.includesControl(formGroup.controls, targetControl);
      }
    });
  }
}
