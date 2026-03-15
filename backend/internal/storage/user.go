package storage

import (
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users"`

	ID                 string           `bun:"id,pk"                   json:"id"`
	Email              string           `bun:"email"                   json:"email"`
	Name               *string          `bun:"name"                    json:"name"`
	Password           string           `bun:"password"                json:"-"`
	Birthdate          scalar.DateTime  `bun:"birthdate"               json:"birthdate"`
	IsAdmin            bool             `bun:"\"isAdmin\""             json:"isAdmin"`
	DefaultMachineType *MachineType     `bun:"\"defaultMachineType\""  json:"defaultMachineType"`
	PasswordChangedAt  *scalar.DateTime `bun:"\"passwordChangedAt\""   json:"-"`
	DeletedAt          *scalar.DateTime `bun:"\"deletedAt\""          json:"-"`
	CreatedAt          scalar.DateTime  `bun:"\"createdAt\""           json:"createdAt"`
	UpdatedAt          scalar.DateTime  `bun:"\"updatedAt\""           json:"updatedAt"`
}

type AuthPayload struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
