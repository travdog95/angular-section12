import { inject, Injectable, signal } from '@angular/core';

import { Place } from './place.model';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, throwError } from 'rxjs';
import { ErrorService } from '../shared/error.service';

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private httpClient = inject(HttpClient);
  private errorService = inject(ErrorService);
  private userPlaces = signal<Place[]>([]);

  loadedUserPlaces = this.userPlaces.asReadonly();

  loadAvailablePlaces() {
    return this.fetchPlaces(
      'http://localhost:3000/places',
      'Failed to load available places'
    );
  }

  loadUserPlaces() {
    // Fetch user places and update the userPlaces signal
    return this.fetchPlaces(
      'http://localhost:3000/user-places',
      'Failed to load user places'
    ).pipe(tap({ next: (places) => this.userPlaces.set(places) }));
  }

  addPlaceToUserPlaces(place: Place) {
    // Optimistically update the userPlaces signal
    const prevPlaces = this.userPlaces();

    // Avoid adding duplicates
    if (!prevPlaces.some((p) => p.id === place.id)) {
      this.userPlaces.set([...prevPlaces, place]);
    }

    return this.httpClient
      .put(`http://localhost:3000/user-places`, {
        placeId: place.id,
      })
      .pipe(
        catchError((error) => {
          // Revert the change in case of an error
          this.userPlaces.set(prevPlaces);
          this.errorService.showError('Failed to add place to user places');
          console.error('Error adding place to user places:', error);
          return throwError(
            () => new Error('Failed to add place to user places')
          );
        })
      );
  }

  removeUserPlace(place: Place) {
    // Optimistically update the userPlaces signal
    const prevPlaces = this.userPlaces();

    // Only remove if it exists
    if (prevPlaces.some((p) => p.id === place.id)) {
      this.userPlaces.set(prevPlaces.filter((p) => p.id !== place.id));
    }

    // Send delete request to the server
    return this.httpClient
      .delete(`http://localhost:3000/user-places/${place.id}`)
      .pipe(
        catchError((error) => {
          // Revert the change in case of an error
          this.userPlaces.set(prevPlaces);
          // Show error message
          this.errorService.showError(
            'Failed to remove place from user places'
          );
          console.error('Error removing place from user places:', error);
          return throwError(
            () => new Error('Failed to remove place from user places')
          );
        })
      );
  }

  private fetchPlaces(url: string, errorMessage: string) {
    return this.httpClient
      .get<{ places: Place[] }>(url, {
        // observe: 'response',
        // observe: 'events',
      })
      .pipe(
        map((resData) => resData.places),
        catchError((error) => {
          console.error('Error fetching places:', error);
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
